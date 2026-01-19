import { Game } from 'boardgame.io';
import { GameState, Player, Resources, TerrainType, RollStatus } from './types';
import { generateBoard } from './boardGen';
import { getSnakeDraftOrder } from './turnOrder';
import { placeSettlement, placeRoad, regenerateBoard } from './moves/setup';
import { buildRoad, buildSettlement, buildCity, endTurn } from './moves/build';
import { tradeBank } from './moves/trade';
import { rollDice } from './moves/roll';
import { dismissRobber } from './moves/robber';
import { discardResources } from './moves/discard';
import { TurnOrder } from 'boardgame.io/core';
import { calculateBoardStats } from './analysis/analyst';
import { PHASES, STAGES, STAGE_MOVES, WINNING_SCORE } from './constants';
import { distributeResources, countResources } from './mechanics/resources';
import { PLAYER_COLORS } from '../components/uiConfig';
import { CoachPlugin } from './analysis/CoachPlugin';
import { enumerate } from './ai/enumerator';
import { stripHtml } from '../utils/sanitize';

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
    dismissRobber,
    discardResources
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

  setup: ({ ctx }, setupData?: { botNames?: Record<string, string> }): GameState => {
    if (!ctx.numPlayers) {
      throw new Error("Number of players must be provided");
    }
    const numPlayers = ctx.numPlayers as number;
    if (numPlayers < 2 || numPlayers > 4) {
      throw new Error("Number of players must be between 2 and 4");
    }

    const { hexes: boardHexes, ports } = generateBoard();
    const hexesMap = Object.fromEntries(boardHexes.map(h => [h.id, h]));

    // Find initial robber location (Standard Rules: Desert)
    const robberHex = boardHexes.find(h => h.terrain === TerrainType.Desert);
    if (!robberHex) {
      throw new Error('Board setup failed: Desert hex not found.');
    }
    const robberLocation = robberHex.id;

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
      const playerId = i.toString();
      const rawName = setupData?.botNames?.[playerId] || `Player ${i + 1}`;
      players[playerId] = {
        id: playerId,
        name: stripHtml(rawName),
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
        ports,
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
      rollStatus: RollStatus.IDLE,
      robberLocation,
      playersToDiscard: [],
      lastSteal: null
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
           G.rollStatus = RollStatus.IDLE;
        },
        onMove: ({ G, ctx, events }) => {
            const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
            if (activeStage === STAGES.ROLLING) {
                const [d1, d2] = G.lastRoll;
                const rollValue = d1 + d2;

                // Distribute Resources
                G.lastRollRewards = distributeResources(G, rollValue);
                G.rollStatus = RollStatus.RESOLVED;

                if (rollValue === 7) {
                    // Robber Trigger: Check for discards
                    const playersToDiscard = Object.values(G.players)
                        .filter(p => countResources(p.resources) > 7)
                        .map(p => p.id);

                    G.playersToDiscard = playersToDiscard;

                    if (events && events.setActivePlayers) {
                         if (playersToDiscard.length > 0) {
                             // Transition to DISCARD stage for all affected players
                             // The current player also needs to wait if they are not discarding
                             // But boardgame.io activePlayers replaces the set.
                             // We set the active players to those who need to discard.
                             // The turn does not advance until they are done.
                             const activePlayersConfig = Object.fromEntries(playersToDiscard.map(pid => [pid, STAGES.DISCARD]));

                             events.setActivePlayers({ value: activePlayersConfig });
                         } else {
                             // No one needs to discard, proceed to Robber Placement
                             events.setActivePlayers({ currentPlayer: STAGES.ROBBER });
                         }
                    }
                } else {
                    // Normal Roll
                    if (events && events.setActivePlayers) {
                        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
                    }
                }
            }
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
           },
           [STAGES.DISCARD]: {
              moves: getMovesForStage(STAGES.DISCARD)
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
