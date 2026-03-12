import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockNews, mockAiDigest, mockSectors, trendingTickers } from '../data/mockData';
import NewsItem from '../components/news/NewsItem';
import AiDigestPanel from '../components/news/AiDigestPanel';
import SectorPulse from '../components/charts/SectorPulse';

const SECTORS  = ['All', 'Tech', 'Finance', 'Energy', 'Health', 'Macro', 'Crypto'];
const IMPACTS  = ['all', 'high', 'med', 'low'] as const;

export default function NewsPage() {
  const navigate = useNavigate();
  const [sector,  setSector]  = useState('All');
  const [impact,  setImpact]  = useState<typeof IMPACTS[number]>('all');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = mockNews.filter((n) => {
    if (impact !== 'all' && n.impact !== impact && !(impact === 'high' && n.impact === 'breaking')) return false;
    // source filter available via dropdown (reserved for expansion)
    if (search && !n.headline.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-secondary border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
          <h1 className="text-sm font-semibold text-[#E8EAF0]">📰 Market News</h1>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4A5568]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search news..."
                className="bg-app border border-border rounded-sm pl-7 pr-3 py-1.5 text-xs
                           text-[#E8EAF0] placeholder-[#4A5568] focus:outline-none focus:border-primary w-40"
              />
            </div>
            {/* Customize */}
            <button className="btn-ghost text-xs gap-1">
              ⚙ Customize Feed
            </button>
            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <div
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-7 h-4 rounded-full transition-colors cursor-pointer relative
                            ${autoRefresh ? 'bg-bull' : 'bg-border'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
                                ${autoRefresh ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-[#8892A4]">Auto-refresh {autoRefresh ? 'ON' : 'OFF'}</span>
            </label>
          </div>
        </div>

        {/* Filter rows */}
        <div className="flex flex-wrap gap-3 text-xs">
          {/* Sectors */}
          <div className="flex items-center gap-1">
            <span className="text-[#4A5568]">Sectors:</span>
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(s)}
                className={`btn text-[10px] py-0.5 px-2 ${sector === s ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#4A5568] hover:text-[#8892A4]'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs mt-1">
          {/* Impact */}
          <div className="flex items-center gap-1">
            <span className="text-[#4A5568]">Impact:</span>
            {(['all', 'high', 'med', 'low'] as const).map((i) => (
              <button key={i} onClick={() => setImpact(i)}
                className={`btn text-[10px] py-0.5 px-2 ${impact === i ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#4A5568] hover:text-[#8892A4]'}`}>
                {i === 'all' ? 'All' : i === 'high' ? '🔴 HIGH' : i === 'med' ? '🟡 MED' : '🟢 LOW'}
              </button>
            ))}
          </div>
          {/* Watchlist only */}
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
            <div onClick={() => setWatchlistOnly(!watchlistOnly)}
              className={`w-7 h-4 rounded-full transition-colors relative ${watchlistOnly ? 'bg-primary' : 'bg-border'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${watchlistOnly ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[#4A5568]">Watchlist Only</span>
          </label>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Left: Feed */}
        <div className="flex-1 overflow-y-auto border-r border-border">
          {filtered.map((item) => (
            <NewsItem key={item.id} item={item} />
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#4A5568] text-sm">No news matching filters</div>
          )}
          <button className="w-full py-3 text-xs text-[#4A5568] hover:text-[#8892A4]">
            Load More ▾
          </button>
        </div>

        {/* Right: AI Digest + stats */}
        <div className="w-80 xl:w-96 shrink-0 overflow-y-auto flex flex-col gap-4 p-4">
          {/* AI Digest */}
          <AiDigestPanel digest={mockAiDigest} />

          {/* Trending tickers */}
          <div className="card">
            <div className="px-3 py-2.5 border-b border-border/50">
              <span className="text-xs font-semibold text-[#E8EAF0]">🔥 Trending by Volume</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {trendingTickers.map((t, i) => (
                <div key={t.ticker} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#4A5568] w-3">{i + 1}.</span>
                  <button
                    onClick={() => navigate(`/research/${t.ticker}`)}
                    className="text-xs font-semibold text-[#E8EAF0] hover:text-primary w-10"
                  >
                    {t.ticker}
                  </button>
                  <div className="flex-1 bg-border h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral rounded-full"
                      style={{ width: `${(t.articleCount / trendingTickers[0].articleCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#4A5568] w-16 text-right">{t.articleCount} articles</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sector sentiment */}
          <SectorPulse sectors={mockSectors} />
        </div>
      </div>
    </div>
  );
}
