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
      <Suspense
        fallback={
          <main
            className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-100"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-amber-400 motion-reduce:animate-none"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold tracking-wide">Loading game…</p>
            </div>
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;
