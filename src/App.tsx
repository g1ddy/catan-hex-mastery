import { useState } from 'react';
import { Board } from './components/Board';
import { generateBoard } from './game/boardGen';
import { Hex } from './game/types';
import './App.css';

function App() {
  const [hexes, setHexes] = useState<Hex[]>(() => generateBoard());

  return (
    <div className="app-container">
      <h1 className="title">Hex Mastery - Phase 1</h1>
      <button
        onClick={() => setHexes(generateBoard())}
        className="new-game-btn"
      >
        New Game
      </button>
      <div className="board-wrapper">
        <Board hexes={hexes} />
      </div>
      <p className="instructions">Open Console to see Hex Coordinates on Click</p>
    </div>
  );
}

export default App;
