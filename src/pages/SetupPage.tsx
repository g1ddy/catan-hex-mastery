import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { GAME_CONFIG } from '../game/config';
import 'react-tooltip/dist/react-tooltip.css';

const LOCAL_MODE_WARNING = "3-4 Player modes are unavailable in Local Pass-and-Play.";
const SUPPORTED_PLAYER_COUNTS = [2, 3, 4];
const DEBUG_PLAYER_COUNT = 2;
const APP_VERSION_FALLBACK = 'DEV-LOCAL';

// CSS Constants
const BASE_BTN_CLASS = `
    w-full max-w-xs py-3 px-6
    backdrop-blur-sm text-white font-bold rounded-lg shadow-md
    transition-all transform hover:-translate-y-1 active:scale-95 btn-focus-ring
`;
const INDIGO_BTN_CLASS = `${BASE_BTN_CLASS} bg-indigo-600/90 border border-indigo-500 hover:bg-indigo-500 hover:border-indigo-400`;
const TEAL_BTN_CLASS = `${BASE_BTN_CLASS} bg-teal-600/90 border border-teal-500 hover:bg-teal-500 hover:border-teal-400`;
const PURPLE_BTN_CLASS = `${BASE_BTN_CLASS} bg-purple-600/90 border border-purple-500 hover:bg-purple-500 hover:border-purple-400`;

export function SetupPage() {
  const navigate = useNavigate();

  // Unified start handler
  const startGame = (numPlayers: number, mode: string, numBots: number = 0) => {
    navigate('/game', {
        state: {
            numPlayers,
            mode,
            numBots,
            matchID: `${mode}-${Date.now()}`
        }
    });
  };

  const handlePlayerSelection = (numPlayers: number) => {
    startGame(numPlayers, 'local');
  };

  const handleDebugSelection = () => {
    // Singleplayer mode (Debug) doesn't use the numBots logic the same way (implied 1 bot usually or empty)
    // but we pass 0 here and let GameClient handle the specific singleplayer config.
    startGame(DEBUG_PLAYER_COUNT, 'singleplayer');
  };

  const handleAutoPlaySelection = () => {
    // 4 Players, All 4 are bots
    startGame(4, 'local', 4);
  };

  const handleVsBotSelection = () => {
    // 3 Players (1 Human, 2 Bots)
    startGame(3, 'local', 2);
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
          <div className="mb-4 flex flex-col items-center">
              <button
                  onClick={handleDebugSelection}
                  data-tooltip-id="setup-tooltip"
                  data-tooltip-content="Single Player Debug Mode: Enables advanced AI controls and boardgame.io Debug Panel"
                  className={INDIGO_BTN_CLASS}
              >
                  1 Player (Debug)
              </button>
              <p className="text-xs text-slate-400 mt-1">
                  DEV ONLY: Recommended for AI development
              </p>
          </div>
        )}

        <div className="mb-4 flex flex-col items-center">
            <button
                onClick={handleVsBotSelection}
                data-tooltip-id="setup-tooltip"
                data-tooltip-content="1 Player (vs Bots): Play against 2 Debug Bots"
                className={TEAL_BTN_CLASS}
            >
                1 Player (vs Bots)
            </button>
        </div>

        <div className="mb-8 flex flex-col items-center">
            <button
                onClick={handleAutoPlaySelection}
                data-tooltip-id="setup-tooltip"
                data-tooltip-content="0 Players (Auto Play): Watch 4 Debug Bots play against each other"
                className={PURPLE_BTN_CLASS}
            >
                0 Players (Auto Play)
            </button>
        </div>

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
        v{import.meta.env.VITE_APP_VERSION || APP_VERSION_FALLBACK}
      </div>
    </div>
  );
}
