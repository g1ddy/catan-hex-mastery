import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { GAME_CONFIG } from '../game/config';
import 'react-tooltip/dist/react-tooltip.css';

const LOCAL_MODE_WARNING = "3-4 Player modes are unavailable in Local Pass-and-Play.";
const SUPPORTED_PLAYER_COUNTS = [2, 3, 4];
const DEBUG_PLAYER_COUNT = 2;

export function SetupPage() {
  const navigate = useNavigate();

  const handlePlayerSelection = (numPlayers: number) => {
    navigate('/game', { state: { numPlayers, mode: 'local' } });
  };

  const handleDebugSelection = () => {
    navigate('/game', { state: { numPlayers: DEBUG_PLAYER_COUNT, mode: 'singleplayer' } });
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
        {import.meta.env.DEV && (
          <div className="mb-8">
              <button
                  onClick={handleDebugSelection}
                  data-tooltip-id="setup-tooltip"
                  data-tooltip-content="Single Player Debug Mode: Enables advanced AI controls and boardgame.io Debug Panel"
                  className="
                      w-full max-w-xs py-3 px-6
                      bg-indigo-600/90 backdrop-blur-sm border border-indigo-500
                      hover:bg-indigo-500 hover:border-indigo-400
                      text-white font-bold rounded-lg shadow-md
                      transition-all transform hover:-translate-y-1 active:scale-95 btn-focus-ring
                      mb-2
                  "
              >
                  1 Player (Debug)
              </button>
              <p className="text-xs text-slate-400">
                  Recommended for AI development and regression testing
              </p>
          </div>
        )}

        <p className="text-xl mb-6">Local Multiplayer:</p>
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

      <div className="absolute bottom-4 text-xs text-slate-500 font-mono">
        v{import.meta.env.VITE_APP_VERSION || 'DEV-LOCAL'}
      </div>
    </div>
  );
}
