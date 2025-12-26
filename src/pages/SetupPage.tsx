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
          {[2, 3, 4].map((num) => {
            const isDisabled = isLocalMode && num > 2;
            return (
              <button
                  key={num}
                  onClick={() => handlePlayerSelection(num)}
                  className={`player-btn ${isDisabled ? 'disabled' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={isDisabled}
                  title={isDisabled ? "3-4 Player modes are unavailable in Local Pass-and-Play." : ""}
              >
                {num} Players
              </button>
            );
          })}
        </div>
        {isLocalMode && (
             <p className="local-mode-warning text-xs text-gray-500 mt-2">
                 * 3-4 Player modes are unavailable in Local Pass-and-Play.
             </p>
        )}
      </div>
    </div>
  );
}
