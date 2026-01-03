import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { GAME_CONFIG } from '../game/config';
import 'react-tooltip/dist/react-tooltip.css';

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
      <Tooltip id="setup-tooltip" />
      <h1 className="title text-4xl font-bold mb-4">Hex Mastery - Setup</h1>

      <div className="max-w-2xl text-center mb-8 px-4">
        <p className="text-slate-300 leading-relaxed">
          Welcome. This module is a specialized training interface for initial settlement placement.
          Use the integrated Analyst Panel and Coach Mode to evaluate board texture and maximize production probability.
          This is a strategic study tool, not a complete game simulation.
        </p>
      </div>

      <div className="setup-menu w-full max-w-lg text-center">
        <p className="text-xl mb-6">Select Game Mode:</p>

        <div className="mb-6 w-full">
             <button
                onClick={() => navigate('/game', { state: { numPlayers: 4, mode: 'singleplayer' } })}
                aria-label="Start 1 Player game vs AI"
                className={`
                  w-full py-4 px-6 mb-4
                  bg-amber-600/80 backdrop-blur-sm border border-amber-500
                  hover:bg-amber-500 hover:border-amber-400
                  text-white text-lg font-bold rounded-xl shadow-lg
                  transition-all transform hover:-translate-y-1 active:scale-95 btn-focus-ring
                `}
             >
                1 Player (vs AI)
             </button>
        </div>

        <p className="text-lg mb-4 text-slate-300">Or Pass-and-Play:</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          {SUPPORTED_PLAYER_COUNTS.map((num) => {
            const isDisabled = isLocalMode && num > 2;
            return (
              <div
                  key={num}
                  className="flex-1"
                  data-tooltip-id={isDisabled ? "setup-tooltip" : undefined}
                  data-tooltip-content={isDisabled ? LOCAL_MODE_WARNING : undefined}
              >
                  <button
                      onClick={() => handlePlayerSelection(num)}
                      aria-label={`Start game with ${num} players`}
                      className={`
                        w-full h-full py-4 px-6
                        bg-slate-800/80 backdrop-blur-sm border border-slate-600
                        hover:bg-slate-700 hover:border-slate-500
                        text-white text-lg font-bold rounded-xl shadow-lg
                        transition-all transform hover:-translate-y-1 active:scale-95 btn-focus-ring
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-slate-800 disabled:hover:border-slate-600
                      `}
                      disabled={isDisabled}
                  >
                    {num} Players
                  </button>
              </div>
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
