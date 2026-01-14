import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { GAME_CONFIG } from '../game/config';
import 'react-tooltip/dist/react-tooltip.css';

const LOCAL_MODE_WARNING = "3-4 Player modes are unavailable in Local Pass-and-Play.";
const SUPPORTED_PLAYER_COUNTS = [2, 3, 4];
const DEBUG_PLAYER_COUNT = 2;
const APP_VERSION_FALLBACK = 'DEV-LOCAL';
const BOT_SCENARIO_PLAYER_COUNT = 3;

// CSS Constants
const SHARED_BTN_BASE = `
    backdrop-blur-sm text-white font-bold rounded-lg shadow-md
    transition-all transform hover:-translate-y-1 active:scale-95 btn-focus-ring
`;

const BASE_BTN_CLASS = `
    ${SHARED_BTN_BASE}
    w-full max-w-xs py-3 px-6
`;

const INDIGO_BTN_CLASS = `${BASE_BTN_CLASS} bg-indigo-600/90 border border-indigo-500 hover:bg-indigo-500 hover:border-indigo-400`;

// Modified Teal class for the scenario buttons (removes max-w-xs to allow flex growing)
const BOT_SCENARIO_BTN_CLASS = `
    ${SHARED_BTN_BASE}
    w-full h-full py-3 px-2
    bg-teal-600/90 border border-teal-500 hover:bg-teal-500 hover:border-teal-400
    text-sm sm:text-base
`;

const pluralize = (count: number, noun: string) => `${count} ${noun}${count !== 1 ? 's' : ''}`;

const generateLabel = (humans: number, bots: number) => {
    if (humans === 0) return "0 Players (Auto Play)";
    if (bots === 0) return `${pluralize(humans, 'Player')} (No Bots)`;
    return `${pluralize(humans, 'Player')} vs ${pluralize(bots, 'Bot')}`;
};

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

      <div className="setup-menu w-full max-w-4xl text-center">
        {import.meta.env.DEV && (
          <div className="mb-8 flex flex-col items-center">
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

        <p className="text-xl mb-4">Bot Scenarios:</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full mb-8">
            {/* Iterate from 0 to 3 human players (Total 3 players in game) */}
            {Array.from({ length: BOT_SCENARIO_PLAYER_COUNT + 1 }, (_, i) => {
                const humans = i;
                const bots = BOT_SCENARIO_PLAYER_COUNT - i;
                const totalPlayers = BOT_SCENARIO_PLAYER_COUNT;
                const scenarioKey = `${humans}-humans-${bots}-bots`;

                return (
                    <div key={scenarioKey} className="flex-1">
                        <button
                            onClick={() => startGame(totalPlayers, 'local', bots)}
                            className={BOT_SCENARIO_BTN_CLASS}
                        >
                            {generateLabel(humans, bots)}
                        </button>
                    </div>
                );
            })}
        </div>

        {import.meta.env.DEV && (
            <>
                <p className="text-xl mb-6">Legacy Multiplayer:</p>
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
            </>
        )}
      </div>

      <div className="absolute bottom-4 text-xs text-slate-500 font-mono">
        v{import.meta.env.VITE_APP_VERSION || APP_VERSION_FALLBACK}
      </div>
    </div>
  );
}
