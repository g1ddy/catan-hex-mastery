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
          <button onClick={() => handlePlayerSelection(3)} className="player-btn">3 Players</button>
          <button onClick={() => handlePlayerSelection(4)} className="player-btn">4 Players</button>
        </div>
      </div>
    </div>
  );
}
