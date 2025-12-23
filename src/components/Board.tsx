import React from 'react';
// @ts-ignore
import { HexGrid, Layout } from 'react-hexgrid';
import { Hex } from '../game/types';
import { GameHex } from './GameHex';

interface BoardProps {
  hexes: Hex[];
}

export const Board: React.FC<BoardProps> = ({ hexes }) => {
  return (
    <div className="board-container" style={{ width: '800px', height: '800px' }}>
      <HexGrid width={800} height={800} viewBox="-50 -50 100 100">
        <Layout size={{ x: 8, y: 8 }} flat={true} spacing={1.02} origin={{ x: 0, y: 0 }}>
          {hexes.map(hex => (
            <GameHex
              key={hex.id}
              hex={hex}
              onClick={(h) => console.log('Clicked Hex:', h.coords, h.terrain)}
            />
          ))}
        </Layout>
      </HexGrid>
    </div>
  );
};
