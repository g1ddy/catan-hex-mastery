import { getSnakeDraftOrder } from '../src/game/turnOrder';

console.log("Verifying Snake Draft Order...");

const order3 = getSnakeDraftOrder(3);
const expected3 = ['0', '1', '2', '2', '1', '0'];
const pass3 = JSON.stringify(order3) === JSON.stringify(expected3);

console.log(`3 Players: ${pass3 ? 'PASS' : 'FAIL'}`);
if (!pass3) {
    console.error(`Expected: ${expected3}`);
    console.error(`Got: ${order3}`);
}

const order4 = getSnakeDraftOrder(4);
const expected4 = ['0', '1', '2', '3', '3', '2', '1', '0'];
const pass4 = JSON.stringify(order4) === JSON.stringify(expected4);

console.log(`4 Players: ${pass4 ? 'PASS' : 'FAIL'}`);
if (!pass4) {
    console.error(`Expected: ${expected4}`);
    console.error(`Got: ${order4}`);
}

if (!pass3 || !pass4) {
    process.exit(1);
}
