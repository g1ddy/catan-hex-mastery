import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './styles/App.css';

const SetupPage = lazy(() =>
  import('./pages/SetupPage').then(({ SetupPage: Page }) => ({ default: Page })),
);
const GamePage = lazy(() =>
  import('./pages/GamePage').then(({ GamePage: Page }) => ({ default: Page })),
);

function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
