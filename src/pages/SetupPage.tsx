import { useNavigate } from 'react-router-dom';
import { GAME_CONFIG } from '../game/config';

const LOCAL_MODE_WARNING = "3-4 Player modes are unavailable in Local Pass-and-Play.";
const SUPPORTED_PLAYER_COUNTS = [2, 3, 4];

export function SetupPage() {
  const navigate = useNavigate();

  const handlePlayerSelection = (numPlayers: number) => {
    navigate('/game', { state: { numPlayers } });
  };

  const isLocalMode = GAME_CONFIG.mode === 'local';

  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-white">
      <h1 className="title text-4xl font-bold mb-8">Hex Mastery - Setup</h1>
      <div className="setup-menu w-full max-w-lg text-center">
        <p className="text-xl mb-6">Select Number of Players:</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          {SUPPORTED_PLAYER_COUNTS.map((num) => {
            const isDisabled = isLocalMode && num > 2;
            return (
              <button
                  key={num}
                  onClick={() => handlePlayerSelection(num)}
                  className={`
                    flex-1 py-4 px-6
                    bg-slate-800/80 backdrop-blur-sm border border-slate-600
                    hover:bg-slate-700 hover:border-slate-500
                    text-white text-lg font-bold rounded-xl shadow-lg
                    transition-all transform hover:-translate-y-1 active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-slate-800 disabled:hover:border-slate-600
                  `}
                  disabled={isDisabled}
                  title={isDisabled ? LOCAL_MODE_WARNING : ""}
              >
                {num} Players
              </button>
            );
          })}
        </div>
        {isLocalMode && (
             <p className="local-mode-warning text-sm text-gray-400 mt-6 italic">
                 * {LOCAL_MODE_WARNING}
             </p>
        )}
      </div>
    </div>
  );
}
