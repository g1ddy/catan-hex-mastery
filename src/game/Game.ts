import { Game, Move } from 'boardgame.io';
import { GameState, Player, Resources } from './types';
import { generateBoard } from './boardGen';
import { getSnakeDraftOrder } from './turnOrder';
import { placeSettlement, placeRoad } from './moves/setup';
import { buildRoad, buildSettlement, buildCity, endTurn } from './moves/build';
import { rollDice } from './moves/roll';
import { TurnOrder } from 'boardgame.io/core';
import { calculateBoardStats } from './analyst';
import { PHASES, STAGES } from './constants';
import { PLAYER_COLORS } from '../components/uiConfig';

const regenerateBoard: Move<GameState> = ({ G }) => {
    const boardHexes = generateBoard();
    const hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));
    G.board.hexes = hexesMap;
    G.boardStats = calculateBoardStats(hexesMap);
};

export const CatanGame: Game<GameState> = {
  name: 'catan',
  minPlayers: 2,
  maxPlayers: 4,

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
              moves: { rollDice },
              next: STAGES.ACTING
           },
           [STAGES.ACTING]: {
              moves: {
                  buildRoad,
                  buildSettlement,
                  buildCity,
                  endTurn
              }
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
