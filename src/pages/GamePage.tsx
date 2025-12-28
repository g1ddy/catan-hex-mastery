import { useLocation, Navigate } from 'react-router-dom';
import { GameClient } from '../GameClient';

export function GamePage() {
  const location = useLocation();
  const numPlayers = location.state?.numPlayers;

  if (!numPlayers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-container game-page">
      <GameClient numPlayers={numPlayers} />
    </div>
  );
}
