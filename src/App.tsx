import { useState } from 'react';
import { Board } from './components/Board';
import { generateBoard } from './game/boardGen';
import { Hex } from './game/types';

function App() {
  const [hexes, setHexes] = useState<Hex[]>(() => generateBoard());

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#282c34',
      minHeight: '100vh',
      color: 'white',
      padding: '20px'
    }}>
      <h1 style={{ margin: '10px' }}>Hex Mastery - Phase 1</h1>
      <button
        onClick={() => setHexes(generateBoard())}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px',
          backgroundColor: '#61dafb',
          border: 'none',
          borderRadius: '5px',
          fontWeight: 'bold'
        }}
      >
        New Game
      </button>
      <div style={{ border: '2px solid #61dafb', borderRadius: '10px', overflow: 'hidden' }}>
        <Board hexes={hexes} />
      </div>
      <p style={{ marginTop: '10px' }}>Open Console to see Hex Coordinates on Click</p>
    </div>
  );
}

export default App;
