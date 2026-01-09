import { getVertexNeighbors } from '../hexUtils.js';

const v1 = '0,0,0::1,-1,0::1,0,-1';
const neighbors = getVertexNeighbors(v1);
console.log('Neighbors of ' + v1 + ':');
neighbors.forEach(n => console.log(n));
