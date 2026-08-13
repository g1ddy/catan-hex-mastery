const { TextDecoder, TextEncoder } = require('node:util');

// React Router relies on the Encoding API, which JSDOM does not expose in all
// supported Node/Jest combinations.
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
});
