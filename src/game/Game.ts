import { Game } from 'boardgame.io';
import { GameState, Player, Resources } from './types';
import { generateBoard } from './boardGen';
import { getSnakeDraftOrder } from './turnOrder';
import { placeSettlement, placeRoad } from './moves/setup';
import { TurnOrder } from 'boardgame.io/core';

export const CatanGame: Game<GameState> = {
  name: 'catan',

  setup: (ctx, setupData?: { numPlayers?: number }): GameState => {
    const numPlayers = ctx.numPlayers || setupData?.numPlayers || 4;
    const boardHexes = generateBoard();
    const hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));

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
      },
      lastPlacedSettlement: null,
      setupOrder: getSnakeDraftOrder(numPlayers),
    };
  },

  phases: {
    setup: {
      start: true,
      turn: {
        order: TurnOrder.CUSTOM_FROM('setupOrder'),
        activePlayers: { currentPlayer: 'placeSettlement' },
      },
      moves: {
        placeSettlement,
        placeRoad,
      },
      endIf: ({ G }) => {
        // End setup phase if all players have placed 2 settlements and 2 roads
        const allPlayersDone = Object.values(G.players).every(
          p => p.settlements.length === 2 && p.roads.length === 2
        );
        return allPlayersDone;
      },
      next: 'mainGame',
    },
    mainGame: {
      // Placeholder for next phases
    },
  },
};
