import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';

const Game = {
  setup: () => ({}),
  moves: {
    throwError: () => {
      throw new Error('Custom Error Message');
    },
    returnInvalid: () => {
      return 'INVALID_MOVE';
    },
  },
};

const client = Client({
  game: Game,
  multiplayer: Local(),
});

client.start();

console.log('Testing throwError...');
try {
  // moves returns void usually, but let's see if it throws synchronously
  client.moves.throwError();
  console.log('throwError: Move executed without throwing locally');
} catch (e) {
  console.log('throwError: Caught error:', e.message);
}

// In some configs, you need to subscribe to log
const state = client.getState();
console.log('State after throwError:', state.ctx.currentPlayer);
