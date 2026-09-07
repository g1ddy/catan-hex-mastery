import type { Ctx, Move } from 'boardgame.io';
import type { GameContext, GameState, MoveHandler } from '../../game/core/types';
import { PHASES, STAGES, type GamePhase, type GameStage } from '../../game/core/constants';

const gamePhases = new Set<string>(Object.values(PHASES));
const gameStages = new Set<string>(Object.values(STAGES));

const asGamePhase = (phase: string): GamePhase | undefined =>
  gamePhases.has(phase) ? phase as GamePhase : undefined;

const asStagesByPlayer = (activePlayers: Ctx['activePlayers']): GameContext['stagesByPlayer'] =>
  Object.fromEntries(Object.entries(activePlayers ?? {}).filter((entry): entry is [string, GameStage] =>
    typeof entry[1] === 'string' && gameStages.has(entry[1])));

export function toGameContext(ctx: Ctx): GameContext {
  return {
    currentPlayer: ctx.currentPlayer,
    turn: ctx.turn,
    phase: asGamePhase(ctx.phase),
    stagesByPlayer: asStagesByPlayer(ctx.activePlayers),
    numPlayers: ctx.numPlayers,
    gameover: ctx.gameover,
  };
}

/** Adapts boardgame.io's invocation object to the Catan-owned move contract. */
export function adaptMove<Args extends unknown[]>(handler: MoveHandler<Args>): Move<GameState> {
  return ({ G, ctx, events, random }, ...args: Args) => handler({
    G,
    ctx: toGameContext(ctx),
    events: {
      endTurn: () => events.endTurn?.(),
      setActivePlayers: stages => events.setActivePlayers?.(stages),
    },
    random: {
      Die: sides => random.Die(sides),
      Shuffle: values => random.Shuffle(values),
    },
  }, ...args);
}
