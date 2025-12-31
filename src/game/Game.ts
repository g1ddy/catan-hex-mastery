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

    const colors = ['#E53935', '#1E88E5', '#FB8C00', '#FDD835', '#8E24AA', '#43A047']; // Red, Blue, Orange, White/Yellow, Purple, Green
    const players: Record<string, Player> = {};

    for (let i = 0; i < numPlayers; i++) {
      players[i.toString()] = {
        id: i.toString(),
        color: colors[i % colors.length],
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
        activeSettlement: null,
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
    }
  },
};
