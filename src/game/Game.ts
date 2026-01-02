import { Game, Move } from 'boardgame.io';
import { GameState, Player, Resources } from './types';
import { generateBoard } from './boardGen';
import { getSnakeDraftOrder } from './turnOrder';
import { placeSettlement, placeRoad } from './moves/setup';
import { buildRoad, buildSettlement, buildCity, endTurn } from './moves/build';
import { rollDice } from './moves/roll';
import { TurnOrder } from 'boardgame.io/core';
import { calculateBoardStats } from './analyst';
import { PHASES, STAGES, STAGE_MOVES } from './constants';
import { PLAYER_COLORS } from '../components/uiConfig';

const regenerateBoard: Move<GameState> = ({ G, events }) => {
    const boardHexes = generateBoard();
    const hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));
    G.board.hexes = hexesMap;
    G.boardStats = calculateBoardStats(hexesMap);

    // Soft Reset: Clear all player placements and resources
    Object.values(G.players).forEach(player => {
        player.settlements = [];
        player.roads = [];
        player.resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
        player.victoryPoints = 0;
    });

    // Reset vertices/edges ownership in board
    Object.keys(G.board.vertices).forEach(k => delete G.board.vertices[k]);
    Object.keys(G.board.edges).forEach(k => delete G.board.edges[k]);

    // Reset roll state
    G.lastRoll = [0, 0];
    G.hasRolled = false;

    // Reset Stage to Place Settlement to avoid stuck state (e.g. if in Place Road but no settlement exists)
    // Using setActivePlayers to strictly force the stage for the current player
    if (events) events.setActivePlayers({ currentPlayer: STAGES.PLACE_SETTLEMENT });
};

// Map string names to move functions for use in definition
const MOVE_MAP = {
    rollDice,
    buildRoad,
    buildSettlement,
    buildCity,
    endTurn,
    placeSettlement,
    placeRoad
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
      hasRolled: false
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
              moves: { placeSettlement, regenerateBoard }
            },
            [STAGES.PLACE_ROAD]: {
              moves: { placeRoad, regenerateBoard }
            }
        },
      },
      moves: {
        placeSettlement,
        placeRoad,
        regenerateBoard
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
           }
        }
      }
    },
    [PHASES.TRADE]: {
        // Placeholder for Trade Phase logic
        moves: {}
    },
    [PHASES.GAME_OVER]: {
        // Placeholder for Game Over logic
        moves: {}
    }
  },
};
