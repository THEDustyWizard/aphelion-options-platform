import { useState } from 'react';
import { RefreshCw, Layout, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { mockRecommendations, mockNews, mockAiDigest, mockSectors, trendingTickers } from '../data/mockData';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import NewsItem from '../components/news/NewsItem';
import AiDigestPanel from '../components/news/AiDigestPanel';
import SectorPulse from '../components/charts/SectorPulse';
import { useWatchlistStore } from '../store';

const IMPACT_FILTERS = ['all', 'high', 'med', 'low'] as const;
type ImpactFilter = typeof IMPACT_FILTERS[number];

export default function HubPage() {
  const navigate = useNavigate();
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [optionsOnly, setOptionsOnly] = useState(false);
  const { groups } = useWatchlistStore();

  const watchlistTickers = new Set(groups.flatMap((g) => g.items.map((i) => i.ticker)));

  const filteredNews = mockNews.filter((n) => {
    if (impactFilter !== 'all' && n.impact !== impactFilter && !(impactFilter === 'high' && n.impact === 'breaking')) return false;
    if (watchlistOnly && !n.tickers.some((t) => watchlistTickers.has(t))) return false;
    if (optionsOnly && !n.triggeredRecs.length) return false;
    return true;
  });

  // Get active alerts
  const activeAlerts = groups
    .flatMap((g) => g.alerts.filter((a) => a.isActive).map((a) => ({ ...a, groupName: g.name })))
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Subheader */}
      <div className="bg-secondary border-b border-border px-4 py-2 flex items-center gap-3 flex-wrap shrink-0">
        {/* News source filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[#4A5568]">📰</span>
          <select className="bg-app border border-border rounded-sm px-2 py-1 text-xs text-[#E8EAF0]">
            <option>All News</option>
            <option>Reuters</option>
            <option>Bloomberg</option>
            <option>CNBC</option>
          </select>
        </div>

        {/* Watchlist only toggle */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <div
            onClick={() => setWatchlistOnly(!watchlistOnly)}
            className={`w-7 h-4 rounded-full transition-colors cursor-pointer relative
                        ${watchlistOnly ? 'bg-primary' : 'bg-border'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
                            ${watchlistOnly ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-[#8892A4]">Watchlist Only</span>
        </label>

        {/* Impact filters */}
        <div className="flex items-center gap-1 ml-2">
          {(['all', 'high', 'med', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setImpactFilter(f)}
              className={`btn text-[10px] py-1 px-2 ${
                impactFilter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#4A5568] hover:text-[#8892A4]'
              }`}
            >
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Options related */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer ml-auto">
          <div
            onClick={() => setOptionsOnly(!optionsOnly)}
            className={`w-7 h-4 rounded-full transition-colors cursor-pointer relative
                        ${optionsOnly ? 'bg-bull' : 'bg-border'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
                            ${optionsOnly ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-[#8892A4]">Options-Related</span>
        </label>

        <button className="btn-ghost text-xs gap-1 ml-2">
          <Layout className="w-3 h-3" />
          Layout
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* LEFT: News + Digest */}
        <div className="w-1/2 border-r border-border flex flex-col overflow-hidden">
          {/* AI Digest */}
          <div className="p-3 border-b border-border shrink-0">
            <AiDigestPanel digest={mockAiDigest} />
          </div>

          {/* News feed */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 pt-3 pb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#E8EAF0]">📰 Live News Feed</span>
              <span className="text-[10px] text-[#4A5568]">{filteredNews.length} articles</span>
            </div>
            <AnimatePresence initial={false}>
              {filteredNews.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1,  y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <NewsItem item={item} />
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredNews.length === 0 && (
              <div className="p-6 text-center text-[#4A5568] text-sm">
                No news matching current filters
              </div>
            )}

            <button className="w-full py-3 text-xs text-[#4A5568] hover:text-[#8892A4] transition-colors">
              Load More ▾
            </button>
          </div>
        </div>

        {/* RIGHT: Recommendations + Signals */}
        <div className="w-1/2 flex flex-col overflow-y-auto">
          {/* Recs header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
            <div>
              <span className="text-sm font-semibold text-[#E8EAF0]">🔥 Today's Top Picks</span>
              <span className="ml-2 text-[10px] text-[#4A5568]">{mockRecommendations.length} recs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#4A5568]">Sort by:</span>
              <select className="bg-app border border-border rounded-sm px-2 py-1 text-[10px] text-[#E8EAF0]">
                <option>Score ▾</option>
                <option>DTE</option>
                <option>IV Rank</option>
              </select>
              <button className="btn-ghost p-1.5" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rec cards grid */}
          <div className="px-4 grid grid-cols-2 gap-3 pb-4">
            <AnimatePresence>
              {mockRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </AnimatePresence>
          </div>

          {/* View all */}
          <div className="px-4 pb-4">
            <button
              onClick={() => navigate('/screener')}
              className="btn-ghost w-full justify-center text-xs gap-1"
            >
              View All in Screener <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Sector Pulse */}
          <div className="px-4 pb-4">
            <SectorPulse sectors={mockSectors} />
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="mx-4 mb-4 card">
              <div className="px-3 py-2.5 border-b border-border/50">
                <span className="text-xs font-semibold text-[#E8EAF0]">
                  ⚡ Active Alerts ({activeAlerts.length})
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {activeAlerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2">
                    <div className="text-xs text-[#8892A4]">
                      <span className="text-warning">{a.ticker}</span> {a.condition}
                    </div>
                    <button
                      onClick={() => navigate(`/research/${a.ticker}`)}
                      className="btn-ghost text-[10px] gap-0.5 py-0.5"
                    >
                      View <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-border/50">
                <button
                  onClick={() => navigate('/watchlist')}
                  className="text-xs text-primary hover:underline"
                >
                  Manage Alerts →
                </button>
              </div>
            </div>
          )}

          {/* Trending Tickers */}
          <div className="mx-4 mb-4 card">
            <div className="px-3 py-2.5 border-b border-border/50">
              <span className="text-xs font-semibold text-[#E8EAF0]">🔥 Trending by News Volume</span>
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
        </div>
      </div>
    </div>
  );
}
