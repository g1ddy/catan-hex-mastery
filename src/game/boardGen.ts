import { Hex, TerrainType, CubeCoordinates, Port, PortType } from './types';
import { getNeighbors, getEdgesForHex, parseEdgeId, getVerticesForEdge } from './hexUtils';
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

function generatePorts(hexes: Record<string, Hex>): Record<string, Port> {
    const ports: Record<string, Port> = {};
    const allEdges: string[] = [];

    Object.values(hexes).forEach(h => {
        const edges = getEdgesForHex(h.coords);
        allEdges.push(...edges);
    });

    // Count edges
    const edgeCounts: Record<string, number> = {};
    allEdges.forEach(e => {
        if (Object.prototype.hasOwnProperty.call(edgeCounts, e)) {
            edgeCounts[e]++;
        } else {
            edgeCounts[e] = 1;
        }
    });

    // Filter boundary edges (count === 1)
    const boundaryEdges = Object.keys(edgeCounts).filter(e =>
        Object.prototype.hasOwnProperty.call(edgeCounts, e) && edgeCounts[e] === 1
    );

    const getEdgeAngle = (eId: string) => {
        const [h1, h2] = parseEdgeId(eId);
        // Midpoint in cube coords
        const midQ = (h1.q + h2.q) / 2;
        const midR = (h1.r + h2.r) / 2;

        // Convert to Cartesian (axial to pixel)
        // x = size * (3/2 * q)
        // y = size * (sqrt(3)/2 * q + sqrt(3) * r)
        // size doesn't matter for angle
        const x = (3/2) * midQ;
        const y = (Math.sqrt(3)/2) * midQ + Math.sqrt(3) * midR;
        return Math.atan2(y, x);
    };

    boundaryEdges.sort((a, b) => getEdgeAngle(a) - getEdgeAngle(b));

    const portTypes: PortType[] = [
        '3:1', '3:1', '3:1', '3:1',
        'wood', 'brick', 'sheep', 'wheat', 'ore'
    ];
    // Shuffle types
    const shuffledTypes = shuffle(portTypes);

    for (let i = 0; i < shuffledTypes.length; i++) {
        // Distribute evenly
        // We have ~30 boundary edges. 9 ports.
        const edgeIndex = Math.floor(i * boundaryEdges.length / shuffledTypes.length);
        // eslint-disable-next-line security/detect-object-injection
        const edgeId = boundaryEdges[edgeIndex];
        const vertices = getVerticesForEdge(edgeId);

        // eslint-disable-next-line security/detect-object-injection
        ports[edgeId] = {
            type: shuffledTypes[i], // eslint-disable-line security/detect-object-injection
            edgeId,
            vertices
        };
    }

    return ports;
}

export function generateBoard(): { hexes: Record<string, Hex>; ports: Record<string, Port> } {
    const coords = generateSpiralCoords();

    const terrainList: TerrainType[] = [];
    Object.keys(TERRAIN_COUNTS).forEach((key) => {
        const t = key as TerrainType;
        const count = TERRAIN_COUNTS[t];
        for(let i=0; i<count; i++) terrainList.push(t);
    });

    let hexes: Record<string, Hex> = {};
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 1000) {
        attempts++;
        const shuffledTerrains = shuffle(terrainList);
        const tempHexes: Record<string, Hex> = {};
        let tokenIdx = 0;

        for (let i = 0; i < coords.length; i++) {
            const coord = coords[i]; // eslint-disable-line security/detect-object-injection
            const terrain = shuffledTerrains[i]; // eslint-disable-line security/detect-object-injection
            let token: number | null = null;

            if (terrain !== TerrainType.Desert && tokenIdx < STANDARD_TOKEN_ORDER.length) {
                token = STANDARD_TOKEN_ORDER[tokenIdx++];
            }

            const id = `${coord.q},${coord.r},${coord.s}`;
            tempHexes[id] = { // eslint-disable-line security/detect-object-injection
                id,
                coords: coord,
                terrain,
                tokenValue: token
            };
        }

        if (isValidBoard(tempHexes)) {
            hexes = tempHexes;
            valid = true;
        }
    }

    if (!valid) {
        console.warn("Failed to generate valid board after 1000 attempts");
    }

    const ports = generatePorts(hexes);

    return { hexes, ports };
}

function isValidBoard(hexes: Record<string, Hex>): boolean {
    for (const hex of Object.values(hexes)) {
        if (hex.tokenValue === 6 || hex.tokenValue === 8) {
            const neighbors = getNeighbors(hex.coords);
            for (const n of neighbors) {
                const nId = `${n.q},${n.r},${n.s}`;
                const nHex = hexes[nId]; // eslint-disable-line security/detect-object-injection
                if (nHex && (nHex.tokenValue === 6 || nHex.tokenValue === 8)) {
                    return false;
                }
            }
        }
    }
    return true;
}
