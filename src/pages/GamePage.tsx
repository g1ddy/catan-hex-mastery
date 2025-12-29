import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;
  const [playerID, setPlayerID] = useState('0');

  if (!numPlayers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="game-page">
      <GameClient
        numPlayers={numPlayers}
        playerID={playerID}
        matchID="default"
      />

      {/* Dev Tools: Player Switcher */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 p-2 bg-slate-800/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-700 z-[200] flex gap-2 items-center text-slate-100">
          <span className="text-xs font-bold uppercase text-slate-400">Dev Mode</span>
          {Array.from({ length: numPlayers }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPlayerID(i.toString())}
              className={`
                w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-colors
                ${playerID === i.toString()
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}
              `}
              title={`Switch to Player ${i}`}
            >
              P{i}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
