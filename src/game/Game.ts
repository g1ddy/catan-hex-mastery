import { Game } from 'boardgame.io';
import { GameState, Player, Resources, TerrainType, RollStatus } from './core/types';
import { generateBoard } from './generation/boardGen';
import { getSnakeDraftOrder } from './mechanics/turnOrder';
import { placeSettlement, placeRoad, regenerateBoard } from './moves/setup';
import { buildRoad, buildSettlement, buildCity, endTurn } from './moves/build';
import { tradeBank } from './moves/trade';
import { rollDice } from './moves/roll';
import { dismissRobber } from './moves/robber';
import { TurnOrder } from 'boardgame.io/core';
import { calculateBoardStats } from './analysis/analyst';
import { PHASES, STAGES, STAGE_MOVES, WINNING_SCORE } from './core/constants';
import { distributeResources, countResources } from './mechanics/resources';
import { PLAYER_COLORS } from '../shared/components/uiConfig';
import { CoachPlugin } from './analysis/CoachPlugin';
import { enumerate } from './rules/enumerator';
import { stripHtml } from '../game/core/utils/sanitize';

const MOVE_MAP = {
    rollDice, buildRoad, buildSettlement, buildCity, tradeBank, endTurn,
    placeSettlement, placeRoad, regenerateBoard, dismissRobber
};

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
    const MAX_TURNS = 200; // Increased limit
    const winner = Object.values(G.players).find(p => p.victoryPoints >= WINNING_SCORE);
    if (winner) return { winner: winner.id };
    if (ctx.turn > MAX_TURNS) return { draw: true };
  },

  setup: ({ ctx }, setupData?: { botNames?: Record<string, string> }): GameState => {
    if (!ctx.numPlayers || ctx.numPlayers < 2 || ctx.numPlayers > 4) {
      throw new Error("Number of players must be between 2 and 4");
    }

    const { hexes, ports } = generateBoard();

    const desertHex = Object.values(hexes).find(h => h.terrain === TerrainType.Desert);
    if (!desertHex) {
      throw new Error('Board setup failed: Desert hex not found.');
    }

    const boardStats = calculateBoardStats(hexes);
    const initialResources: Resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    const players: Record<string, Player> = {};

    for (let i = 0; i < ctx.numPlayers; i++) {
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
        hexes,
        ports,
        vertices: {},
        edges: {},
      },
      players,
      setupPhase: { activeRound: 1 },
      setupOrder: getSnakeDraftOrder(ctx.numPlayers),
      lastRoll: [0, 0],
      boardStats,
      rollStatus: RollStatus.IDLE,
      robberLocation: desertHex.id,
      playersToDiscard: [],
      notification: null
    };
  },

  phases: {
    [PHASES.SETUP]: {
      start: true,
      turn: {
        order: TurnOrder.CUSTOM_FROM('setupOrder'),
        activePlayers: { currentPlayer: STAGES.PLACE_SETTLEMENT },
        stages: {
            [STAGES.PLACE_SETTLEMENT]: { moves: getMovesForStage(STAGES.PLACE_SETTLEMENT) },
            [STAGES.PLACE_ROAD]: { moves: getMovesForStage(STAGES.PLACE_ROAD) }
        },
      },
      endIf: ({ G }) => Object.values(G.players).every(p => p.settlements.length === 2 && p.roads.length === 2),
      next: PHASES.GAMEPLAY,
    },
    [PHASES.GAMEPLAY]: {
      turn: {
        activePlayers: { currentPlayer: STAGES.ROLLING },
        onBegin: ({ G }) => { G.rollStatus = RollStatus.IDLE; },
        onMove: ({ G, ctx, events, random }) => {
            const activeStage = ctx.activePlayers?.[ctx.currentPlayer];
            if (activeStage === STAGES.ROLLING) {
                const rollValue = G.lastRoll[0] + G.lastRoll[1];
                G.notification = { type: 'production', rewards: distributeResources(G, rollValue), rollValue };
                G.rollStatus = RollStatus.RESOLVED;

                if (rollValue === 7) {
                    Object.values(G.players).forEach(player => {
                        const total = countResources(player.resources);
                        if (total > 7) {
                            const toDiscard = Math.floor(total / 2);
                            const resources: (keyof Resources)[] = [];
                            (Object.entries(player.resources) as [keyof Resources, number][]).forEach(([res, amount]) => {
                                resources.push(...Array(amount).fill(res));
                            });
                            random.Shuffle(resources).slice(0, toDiscard).forEach(res => player.resources[res]--);
                        }
                    });
                    events.setActivePlayers?.({ currentPlayer: STAGES.ROBBER });
                } else {
                    events.setActivePlayers?.({ currentPlayer: STAGES.ACTING });
                }
            }
        },
        stages: {
           [STAGES.ROLLING]: { moves: getMovesForStage(STAGES.ROLLING) },
           [STAGES.ACTING]: { moves: getMovesForStage(STAGES.ACTING) },
           [STAGES.ROBBER]: { moves: getMovesForStage(STAGES.ROBBER) }
        }
      }
    },
    [PHASES.GAME_OVER]: {}
  },
};
