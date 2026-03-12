/**
 * APHELION Desktop
 * OPTIONS INTELLIGENCE TERMINAL
 * ██████████████████████████████
 * CLASSIFICATION: TOP SECRET
 */
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TitleBar from './components/layout/TitleBar';
import Topbar from './components/layout/Topbar';
import MarketStatusBar from './components/layout/MarketStatusBar';
import BootScreen from './components/ui/BootScreen';
import HubPage from './pages/HubPage';
import ScreenerPage from './pages/ScreenerPage';
import ResearchPage from './pages/ResearchPage';
import WatchlistPage from './pages/WatchlistPage';
import NewsPage from './pages/NewsPage';
import SettingsPage from './pages/SettingsPage';
import PricingModelsPage from './pages/PricingModelsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [booted, setBooted] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      {!booted && <BootScreen onComplete={() => setBooted(true)} />}
      <BrowserRouter>
        <div className="flex flex-col h-screen bg-black overflow-hidden">
          {/* Custom Electron titlebar */}
          <TitleBar />
          {/* Navigation */}
          <Topbar />
          {/* Market intel feed */}
          <MarketStatusBar />

          {/* Main content area */}
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/"              element={<HubPage />} />
              <Route path="/screener"      element={<ScreenerPage />} />
              <Route path="/research/:ticker" element={<ResearchPage />} />
              <Route path="/research"      element={<ResearchPage />} />
              <Route path="/watchlist"     element={<WatchlistPage />} />
              <Route path="/news"          element={<NewsPage />} />
              <Route path="/settings"      element={<SettingsPage />} />
              <Route path="/pricing"       element={<PricingModelsPage />} />
            </Routes>
          </main>

          {/* Boot status line at bottom */}
          <div
            className="h-5 bg-black border-t border-[#002200] flex items-center px-3 gap-4 shrink-0"
          >
            <span
              className="text-[#003300] tracking-wider"
              style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px' }}
            >
              APHELION v1.0.0 // SCHWAB API // UPLINK ACTIVE
            </span>
            <span
              className="text-[#003300] ml-auto"
              style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px' }}
            >
              ▸ READY
              <span className="animate-blink text-[#00ff41]">█</span>
            </span>
          </div>
        </div>

        {/* Toast portal - terminal styled */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#000',
              padding: '8px 12px',
              border: '1px solid #003300',
              borderRadius: '0',
              color: '#00ff41',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: '12px',
              letterSpacing: '0.05em',
              boxShadow: '0 0 12px #00ff4133',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
