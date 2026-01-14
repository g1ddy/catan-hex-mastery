import { Game, Move } from 'boardgame.io';
import { GameState, Player, Resources, TerrainType } from './types';
import { generateBoard } from './boardGen';
import { getSnakeDraftOrder } from './turnOrder';
import { placeSettlement, placeRoad } from './moves/setup';
import { buildRoad, buildSettlement, buildCity, endTurn } from './moves/build';
import { tradeBank } from './moves/trade';
import { rollDice } from './moves/roll';
import { dismissRobber } from './moves/robber';
import { TurnOrder } from 'boardgame.io/core';
import { calculateBoardStats } from './analyst';
import { PHASES, STAGES, STAGE_MOVES } from './constants';
import { PLAYER_COLORS } from '../components/uiConfig';
import { CoachPlugin } from './analysis/CoachPlugin';
import { enumerate } from './ai';

const regenerateBoard: Move<GameState> = ({ G }) => {
    const boardHexes = generateBoard();
    const hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));
    G.board.hexes = hexesMap;
    G.boardStats = calculateBoardStats(hexesMap);
};

// Map string names to move functions for use in definition
const MOVE_MAP = {
    rollDice,
    buildRoad,
    buildSettlement,
    buildCity,
    tradeBank,
    endTurn,
    placeSettlement,
    placeRoad,
    regenerateBoard,
    dismissRobber
};

// Helper to pick moves from STAGE_MOVES
const getMovesForStage = (stage: keyof typeof STAGE_MOVES) => {
    const moves = STAGE_MOVES[stage];
    return Object.fromEntries(moves.map(m => [m, MOVE_MAP[m as keyof typeof MOVE_MAP]]));
};

export const CatanGame: Game<GameState> = {
  name: 'catan',
  minPlayers: 2,
  maxPlayers: 4,
  plugins: [CoachPlugin],
  ai: {
    enumerate,
  },

  endIf: ({ G, ctx }) => {
    const WINNING_SCORE = 10;
    const MAX_TURNS = 100;

    // 1. CHECK FOR WINNER (WINNING_SCORE Victory Points)
    const winner = Object.values(G.players).find(
      player => player.victoryPoints >= WINNING_SCORE
    );

    if (winner) {
      return { winner: winner.id };
    }

    // 2. CHECK FOR DRAW (MAX_TURNS Turns Limit)
    if (ctx.turn > MAX_TURNS) {
      return { draw: true };
    }
  },

  setup: ({ ctx }, _setupData?: unknown): GameState => {
    if (!ctx.numPlayers) {
      throw new Error("Number of players must be provided");
    }
    const numPlayers = ctx.numPlayers as number;
    if (numPlayers < 2 || numPlayers > 4) {
      throw new Error("Number of players must be between 2 and 4");
    }

    const boardHexes = generateBoard();
    const hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));

    // Find initial robber location (Standard Rules: Desert)
    const robberHex = boardHexes.find(h => h.terrain === TerrainType.Desert) || boardHexes[0];
    const robberLocation = robberHex?.id || '';

    const boardStats = calculateBoardStats(hexesMap);

    const initialResources: Resources = {
      wood: 0,
      brick: 0,
      sheep: 0,
      wheat: 0,
      ore: 0,
    };

    const players: Record<string, Player> = {};

    for (let i = 0; i < numPlayers; i++) {
      players[i.toString()] = {
        id: i.toString(),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        resources: { ...initialResources },
        settlements: [],
        roads: [],
        victoryPoints: 0,
      };
    }

    return {
      board: {
        hexes: hexesMap,
        vertices: {},
        edges: {},
      },
      players,
      setupPhase: {
        activeRound: 1,
      },
      setupOrder: getSnakeDraftOrder(numPlayers),
      lastRoll: [0, 0],
      lastRollRewards: {},
      boardStats,
      hasRolled: false,
      robberLocation
    };
  },

  phases: {
    [PHASES.SETUP]: {
      start: true,
      turn: {
        order: TurnOrder.CUSTOM_FROM('setupOrder'),
        activePlayers: { currentPlayer: STAGES.PLACE_SETTLEMENT },
        stages: {
            [STAGES.PLACE_SETTLEMENT]: {
              moves: getMovesForStage(STAGES.PLACE_SETTLEMENT)
            },
            [STAGES.PLACE_ROAD]: {
              moves: getMovesForStage(STAGES.PLACE_ROAD)
            }
        },
      },
      endIf: ({ G }) => {
        // End setup phase if all players have placed 2 settlements and 2 roads
        const allPlayersDone = Object.values(G.players).every(
          p => p.settlements.length === 2 && p.roads.length === 2
        );
        return allPlayersDone;
      },
      next: PHASES.GAMEPLAY,
    },
    [PHASES.GAMEPLAY]: {
      turn: {
        activePlayers: { currentPlayer: STAGES.ROLLING },
        onBegin: ({ G }) => {
           G.hasRolled = false;
        },
        stages: {
           [STAGES.ROLLING]: {
              moves: getMovesForStage(STAGES.ROLLING)
           },
           [STAGES.ACTING]: {
              moves: getMovesForStage(STAGES.ACTING)
           },
           [STAGES.ROBBER]: {
              moves: getMovesForStage(STAGES.ROBBER)
           }
        }
      }
    },
    [PHASES.GAME_OVER]: {
        // Placeholder for Game Over logic
        moves: {}
    }
  },
};
