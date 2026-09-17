import { executeCatanMove } from './src/game/moves/execution.ts';
import { GameContext, GameRandom } from './src/game/core/types.ts';
import { createMockGameState, createTestPlayer } from './src/game/core/testing.ts';

const mockRng: GameRandom = {
  Die: () => 1,
  Shuffle: (arr) => arr,
};

const G = createMockGameState({ players: { '0': createTestPlayer('0') } });
const ctx: GameContext = { currentPlayer: '0', turn: 1, phase: 'GAMEPLAY', stagesByPlayer: { '0': 'ACTING' }, numPlayers: 1 };

try {
  // @ts-expect-error - testing unhandled move
  executeCatanMove(G, ctx, { move: 'unknownMove', args: [] }, mockRng);
} catch (e: any) {
  console.log(e.message);
}
