import { useNavigate } from 'react-router-dom';
import { GAME_CONFIG } from '../game/config';

export function SetupPage() {
  const navigate = useNavigate();

  const handlePlayerSelection = (numPlayers: number) => {
    navigate('/game', { state: { numPlayers } });
  };

  const isLocalMode = GAME_CONFIG.mode === 'local';

  return (
    <div className="app-container">
      <h1 className="title">Hex Mastery - Setup</h1>
      <div className="setup-menu">
        <p>Select Number of Players:</p>
        <div className="button-group">
            <button
                onClick={() => handlePlayerSelection(2)}
                className="player-btn"
            >
              2 Players
            </button>
          {[3, 4].map((num) => (
            <button
                key={num}
                onClick={() => !isLocalMode && handlePlayerSelection(num)}
                className={`player-btn ${isLocalMode ? 'disabled' : ''}`}
                disabled={isLocalMode}
                style={isLocalMode ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                title={isLocalMode ? "3-4 Player modes are unavailable in Local Pass-and-Play." : ""}
            >
              {num} Players
            </button>
          ))}
        </div>
        {isLocalMode && (
             <p className="local-mode-warning" style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
                 * 3-4 Player modes are unavailable in Local Pass-and-Play.
             </p>
        )}
      </div>
    </div>
  );
}
