import { Hex, TerrainType, CubeCoordinates } from './types';
import { getNeighbors } from './hexUtils';
import { shuffle } from 'lodash';

const TERRAIN_COUNTS: Record<TerrainType, number> = {
  [TerrainType.Forest]: 4,
  [TerrainType.Pasture]: 4,
  [TerrainType.Fields]: 4,
  [TerrainType.Hills]: 3,
  [TerrainType.Mountains]: 3,
  [TerrainType.Desert]: 1,
  [TerrainType.Sea]: 0
};

// Standard order A-R
const STANDARD_TOKEN_ORDER = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

function generateSpiralCoords(): CubeCoordinates[] {
    const results: CubeCoordinates[] = [];
    const dirs = [
        { q: 1, r: -1, s: 0 },
        { q: 1, r: 0, s: -1 },
        { q: 0, r: 1, s: -1 },
        { q: -1, r: 1, s: 0 },
        { q: -1, r: 0, s: 1 },
        { q: 0, r: -1, s: 1 },
    ];

    [2, 1, 0].forEach(radius => {
        if (radius === 0) {
            results.push({ q: 0, r: 0, s: 0 });
            return;
        }
        let c = {
            q: dirs[4].q * radius,
            r: dirs[4].r * radius,
            s: dirs[4].s * radius
        };

        for (let i = 0; i < 6; i++) {
             for (let j = 0; j < radius; j++) {
                 results.push(c);
                 c = { q: c.q + dirs[i].q, r: c.r + dirs[i].r, s: c.s + dirs[i].s };
             }
        }
    });
    return results;
}

export function generateBoard(): Hex[] {
    const coords = generateSpiralCoords();

    const terrainList: TerrainType[] = [];
    Object.entries(TERRAIN_COUNTS).forEach(([t, count]) => {
        // @ts-ignore
        for(let i=0; i<count; i++) terrainList.push(t as TerrainType);
    });

    let hexes: Hex[] = [];
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 1000) {
        attempts++;
        const shuffledTerrains = shuffle(terrainList);
        const tempHexes: Hex[] = [];
        let tokenIdx = 0;

        for (let i = 0; i < coords.length; i++) {
            const coord = coords[i];
            const terrain = shuffledTerrains[i];
            let token: number | null = null;

            if (terrain !== TerrainType.Desert && tokenIdx < STANDARD_TOKEN_ORDER.length) {
                token = STANDARD_TOKEN_ORDER[tokenIdx++];
            }

            tempHexes.push({
                id: `${coord.q},${coord.r},${coord.s}`,
                coords: coord,
                terrain,
                tokenValue: token
            });
        }

        if (isValidBoard(tempHexes)) {
            hexes = tempHexes;
            valid = true;
        }
    }

    if (!valid) {
        console.warn("Failed to generate valid board after 1000 attempts");
    }

    return hexes;
}

function isValidBoard(hexes: Hex[]): boolean {
    const hexMap = new Map<string, Hex>();
    hexes.forEach(h => hexMap.set(h.id, h));

    for (const hex of hexes) {
        if (hex.tokenValue === 6 || hex.tokenValue === 8) {
            const neighbors = getNeighbors(hex.coords);
            for (const n of neighbors) {
                const nId = `${n.q},${n.r},${n.s}`;
                const nHex = hexMap.get(nId);
                if (nHex && (nHex.tokenValue === 6 || nHex.tokenValue === 8)) {
                    return false;
                }
            }
        }
    }
    return true;
}
