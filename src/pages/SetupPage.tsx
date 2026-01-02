import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

const SUPPORTED_PLAYER_COUNTS = [2, 3, 4];

export function SetupPage() {
  const navigate = useNavigate();

  const handlePlayerSelection = (numPlayers: number) => {
    navigate('/game', { state: { numPlayers, mode: 'local' } });
  };

  const handleSinglePlayerDebug = () => {
    navigate('/game', { state: { numPlayers: 3, mode: 'singleplayer' } });
  };

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
        <p className="text-xl mb-4 text-slate-400 font-semibold">Single Player (Debug)</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full mb-8">
           <div className="flex-1">
              <button
                  onClick={handleSinglePlayerDebug}
                  className={`
                    w-full h-full py-4 px-6
                    bg-indigo-600/80 backdrop-blur-sm border border-indigo-500
                    hover:bg-indigo-500 hover:border-indigo-400
                    text-white text-lg font-bold rounded-xl shadow-lg
                    transition-all transform hover:-translate-y-1 active:scale-95
                  `}
              >
                1 Player (vs AI)
              </button>
           </div>
        </div>

        <p className="text-xl mb-4 text-slate-400 font-semibold">Local Pass-and-Play</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          {SUPPORTED_PLAYER_COUNTS.map((num) => {
            return (
              <div
                  key={num}
                  className="flex-1"
              >
                  <button
                      onClick={() => handlePlayerSelection(num)}
                      className={`
                        w-full h-full py-4 px-6
                        bg-slate-800/80 backdrop-blur-sm border border-slate-600
                        hover:bg-slate-700 hover:border-slate-500
                        text-white text-lg font-bold rounded-xl shadow-lg
                        transition-all transform hover:-translate-y-1 active:scale-95
                      `}
                  >
                    {num} Players
                  </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
