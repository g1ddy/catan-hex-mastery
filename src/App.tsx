import { useState } from 'react';
import { GameClient } from './GameClient';
import './App.css';

function App() {
  const [numPlayers, setNumPlayers] = useState<number | null>(null);

  if (numPlayers !== null) {
    return (
      <div className="app-container">
        {/* @ts-ignore: boardgame.io Client props typing issue */}
        <GameClient numPlayers={numPlayers} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="title">Hex Mastery - Setup</h1>
      <div className="setup-menu">
        <p>Select Number of Players:</p>
        <div className="button-group">
          <button onClick={() => setNumPlayers(3)} className="player-btn">3 Players</button>
          <button onClick={() => setNumPlayers(4)} className="player-btn">4 Players</button>
        </div>
      </div>
    </div>
  );
}

export default App;
