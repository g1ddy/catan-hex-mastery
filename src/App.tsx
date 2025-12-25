import { HashRouter, Routes, Route } from 'react-router-dom';
import { SetupPage } from './pages/SetupPage';
import { GamePage } from './pages/GamePage';
import './App.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SetupPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
