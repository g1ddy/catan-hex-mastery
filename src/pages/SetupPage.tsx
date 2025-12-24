import { useNavigate } from 'react-router-dom';

export function SetupPage() {
  const navigate = useNavigate();

  const handlePlayerSelection = (numPlayers: number) => {
    navigate('/game', { state: { numPlayers } });
  };

  return (
    <div className="app-container">
      <h1 className="title">Hex Mastery - Setup</h1>
      <div className="setup-menu">
        <p>Select Number of Players:</p>
        <div className="button-group">
          {[3, 4].map((num) => (
            <button key={num} onClick={() => handlePlayerSelection(num)} className="player-btn">
              {num} Players
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
