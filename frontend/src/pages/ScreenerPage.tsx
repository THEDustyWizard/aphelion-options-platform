import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Settings, ArrowRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockRecommendations } from '../data/mockData';
import { scoreColor, fmtTimeAgo } from '../utils';
import { useScreenerStore } from '../store';
import ScoreBar from '../components/ui/ScoreBar';
import SchwabButton from '../components/ui/SchwabButton';

const PAGE_SIZE = 6;

export default function ScreenerPage() {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters } = useScreenerStore();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [lastRun, setLastRun] = useState<Date>(new Date(Date.now() - 3 * 60_000));
  const [scanning, setScanning] = useState(false);

  // Filter results
  const results = mockRecommendations.filter((r) => {
    if (r.score < filters.scoreMin) return false;
    if (r.dte < filters.dteMin || r.dte > filters.dteMax) return false;
    if (r.ivRank < filters.ivRankMin) return false;
    if (!filters.optionTypes.calls && r.optionType === 'call') return false;
    if (!filters.optionTypes.puts  && r.optionType === 'put')  return false;
    return true;
  });

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleScan() {
    setScanning(true);
    setTimeout(() => { setScanning(false); setLastRun(new Date()); }, 1500);
  }

  const expandedRec = results.find((r) => r.id === expandedId);

  // Score counts
  const highCount = results.filter((r) => r.conviction === 'high').length;
  const medCount  = results.filter((r) => r.conviction === 'medium').length;
  const lowCount  = results.filter((r) => r.conviction === 'low').length;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[#E8EAF0]">🔍 Screener & Signals</h1>
          <p className="text-[10px] text-[#4A5568] mt-0.5">
            Last run: {fmtTimeAgo(lastRun.toISOString())}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="btn-primary gap-2"
        >
          <Play className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Run Fresh Scan ▶'}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#E8EAF0]"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-[#4A5568]" />
            Filters
          </span>
          {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {filtersOpen && (
          <div className="border-t border-border px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sectors */}
            <div>
              <label className="text-[10px] text-[#4A5568] uppercase tracking-wide block mb-1">Sectors</label>
              <select
                className="w-full bg-app border border-border rounded-sm px-2 py-1.5 text-xs text-[#E8EAF0]"
                value={filters.sectors[0] ?? 'all'}
                onChange={(e) => setFilters({ sectors: e.target.value === 'all' ? [] : [e.target.value] })}
              >
                <option value="all">All</option>
                <option value="tech">Tech</option>
                <option value="finance">Finance</option>
                <option value="energy">Energy</option>
                <option value="health">Health</option>
                <option value="macro">Macro</option>
              </select>
            </div>

            {/* Strategy */}
            <div>
              <label className="text-[10px] text-[#4A5568] uppercase tracking-wide block mb-1">Strategy</label>
              <select
                className="w-full bg-app border border-border rounded-sm px-2 py-1.5 text-xs text-[#E8EAF0]"
                value={filters.strategy}
                onChange={(e) => setFilters({ strategy: e.target.value })}
              >
                <option value="all">All</option>
                <option value="long_call">Long Call</option>
                <option value="long_put">Long Put</option>
                <option value="bull_spread">Bull Spread</option>
                <option value="bear_spread">Bear Spread</option>
              </select>
            </div>

            {/* DTE */}
            <div>
              <label className="text-[10px] text-[#4A5568] uppercase tracking-wide block mb-1">
                DTE: {filters.dteMin}–{filters.dteMax}d
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.dteMin}
                  onChange={(e) => setFilters({ dteMin: +e.target.value })}
                  className="w-full bg-app border border-border rounded-sm px-2 py-1.5 text-xs text-[#E8EAF0]"
                  min={1} max={filters.dteMax}
                />
                <input
                  type="number"
                  value={filters.dteMax}
                  onChange={(e) => setFilters({ dteMax: +e.target.value })}
                  className="w-full bg-app border border-border rounded-sm px-2 py-1.5 text-xs text-[#E8EAF0]"
                  min={filters.dteMin} max={365}
                />
              </div>
            </div>

            {/* Min score */}
            <div>
              <label className="text-[10px] text-[#4A5568] uppercase tracking-wide block mb-1">
                Min Score: {filters.scoreMin}
              </label>
              <input
                type="range"
                min={0} max={100}
                value={filters.scoreMin}
                onChange={(e) => setFilters({ scoreMin: +e.target.value })}
                className="w-full accent-primary"
              />
            </div>

            {/* IV Rank */}
            <div>
              <label className="text-[10px] text-[#4A5568] uppercase tracking-wide block mb-1">
                IV Rank Min: {filters.ivRankMin}
              </label>
              <input
                type="range"
                min={0} max={100}
                value={filters.ivRankMin}
                onChange={(e) => setFilters({ ivRankMin: +e.target.value })}
                className="w-full accent-primary"
              />
            </div>

            {/* Option types */}
            <div>
              <label className="text-[10px] text-[#4A5568] uppercase tracking-wide block mb-1">Option Types</label>
              <div className="flex flex-col gap-1">
                {(['calls', 'puts', 'spreads'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.optionTypes[t]}
                      onChange={() => setFilters({ optionTypes: { ...filters.optionTypes, [t]: !filters.optionTypes[t] }})}
                      className="accent-primary"
                    />
                    <span className="text-[#8892A4] capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div className="flex items-end col-span-2 gap-2">
              <button onClick={resetFilters} className="btn-ghost text-xs">Reset Filters</button>
              <button className="btn-ghost text-xs gap-1">
                ⭐ Save Preset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#8892A4]">{results.length} matches</span>
          <span className="badge-bear">{highCount} HIGH</span>
          <span className="badge-warn">{medCount} MED</span>
          <span className="badge-bull">{lowCount} LOW</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#4A5568]">Sort:</span>
          <select className="bg-app border border-border rounded-sm px-2 py-1 text-[10px] text-[#E8EAF0]">
            <option>Score ▾</option>
            <option>DTE</option>
            <option>IV Rank</option>
          </select>
          <button className="btn-ghost text-[10px] gap-1">
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-[#4A5568] text-[10px] uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left">Score</th>
              <th className="px-4 py-2.5 text-left">Ticker / Trade</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">DTE</th>
              <th className="px-4 py-2.5 text-right">IV Rk</th>
              <th className="px-4 py-2.5 text-right">Est P&L</th>
              <th className="px-4 py-2.5 text-right">Risk</th>
              <th className="px-4 py-2.5 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {pageResults.map((rec) => {
              const isExpanded = expandedId === rec.id;
              const color = scoreColor(rec.score);
              return (
                <>
                  <tr
                    key={rec.id}
                    className={`border-b border-border/50 cursor-pointer transition-colors
                                ${isExpanded ? 'bg-hover' : 'hover:bg-hover/50'}`}
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-border h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${rec.score}%`, backgroundColor: color }} />
                          </div>
                        </div>
                        <span className="font-mono font-bold text-sm" style={{ color }}>{rec.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#E8EAF0]">
                        {rec.conviction === 'high' ? '🔥 ' : '📊 '}
                        {rec.ticker} {rec.strike}{rec.optionType === 'call' ? 'C' : 'P'}
                      </div>
                      <div className="text-[#4A5568]">{rec.companyName}</div>
                    </td>
                    <td className="px-4 py-3 text-[#8892A4]">
                      {rec.optionType === 'call' ? 'Long Call' : rec.optionType === 'put' ? 'Long Put' : 'Spread'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#8892A4]">{rec.dte}d</td>
                    <td className="px-4 py-3 text-right font-mono text-[#8892A4]">{rec.ivRank}</td>
                    <td className="px-4 py-3 text-right font-mono text-bull">
                      +${rec.estimatedPnl}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge ${rec.conviction === 'high' ? 'badge-bull' : rec.conviction === 'medium' ? 'badge-warn' : 'badge-bear'}`}>
                        {rec.conviction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/research/${rec.ticker}?rec=${rec.id}`); }}
                        className="btn-ghost text-[10px] gap-0.5 py-1"
                      >
                        Analyze <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded signal breakdown */}
                  {isExpanded && expandedRec && (
                    <tr key={`${rec.id}-expanded`} className="bg-hover/50">
                      <td colSpan={8} className="px-4 pb-4 pt-2">
                        <div className="border border-border/50 rounded-md p-3">
                          <div className="font-semibold text-sm text-[#E8EAF0] mb-2">
                            {rec.ticker} {rec.strike}{rec.optionType === 'call' ? 'C' : 'P'} — Signal Breakdown
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-3">
                            {Object.entries(rec.signals).map(([key, val]) => {
                              const labels: Record<string, string> = {
                                momentum: 'Momentum', ivAnalysis: 'IV Analysis',
                                newsSentiment: 'News Sentiment', earningsRisk: 'Earnings Risk',
                                technicalSetup: 'Technical Setup', optionsFlow: 'Options Flow',
                              };
                              return (
                                <ScoreBar key={key} score={val} label={labels[key] ?? key} height="h-1" />
                              );
                            })}
                          </div>
                          <div className="text-xs text-[#8892A4] mb-3 border-t border-border/50 pt-2">
                            <strong className="text-[#E8EAF0]">Thesis: </strong>{rec.thesis}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/research/${rec.ticker}?rec=${rec.id}`)}
                              className="btn-ghost text-xs gap-1"
                            >
                              Research ▶
                            </button>
                            <SchwabButton recId={rec.id} optionSymbol={rec.optionSymbol ?? rec.schwabSymbol} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#4A5568]">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-ghost disabled:opacity-30"
          >
            ← Prev
          </button>
          <span>Page {page + 1} of {totalPages} · Showing {pageResults.length} of {results.length}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="btn-ghost disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
