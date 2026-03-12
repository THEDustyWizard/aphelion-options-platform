import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Star, Bell, Share2 } from 'lucide-react';
import { mockRecommendations, mockNews, mockAaplChain } from '../data/mockData';
import { fmtPrice, fmtPct, fmtVolume, fmtIv, scoreColor, estimatePnl } from '../utils';
import ScoreBar from '../components/ui/ScoreBar';
import SchwabButton from '../components/ui/SchwabButton';
import NewsItem from '../components/news/NewsItem';

const TradingViewChart = lazy(() => import('../components/charts/TradingViewChart'));

type Tab = 'overview' | 'chain' | 'simulator' | 'news';

// Mock quote data per ticker
const QUOTES: Record<string, { price: number; change: number; changePct: number; volume: number; marketCap: string; pe: number; high52: number; low52: number }> = {
  AAPL:  { price: 191.42, change: 3.82,  changePct: 2.03,  volume: 58_000_000, marketCap: '$2.89T', pe: 31.2, high52: 199, low52: 164 },
  NVDA:  { price: 875.40, change: 7.10,  changePct: 0.82,  volume: 45_000_000, marketCap: '$2.15T', pe: 65.1, high52: 974, low52: 410 },
  SPY:   { price: 598.23, change: 2.41,  changePct: 0.40,  volume: 82_000_000, marketCap: 'ETF',    pe: 0,    high52: 613, low52: 490 },
  META:  { price: 562.80, change: 6.15,  changePct: 1.10,  volume: 21_000_000, marketCap: '$1.43T', pe: 27.8, high52: 590, low52: 390 },
  MSFT:  { price: 415.60, change: -0.92, changePct: -0.22, volume: 19_000_000, marketCap: '$3.08T', pe: 38.4, high52: 468, low52: 362 },
  TSLA:  { price: 187.20, change: -4.30, changePct: -2.24, volume: 98_000_000, marketCap: '$0.60T', pe: 44.2, high52: 299, low52: 139 },
};

export default function ResearchPage() {
  const { ticker = 'AAPL' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const quote = QUOTES[ticker] ?? QUOTES.AAPL;
  const rec   = mockRecommendations.find((r) => r.ticker === ticker);
  const news  = mockNews.filter((n) => n.tickers.includes(ticker));
  const chain = mockAaplChain[0];

  void searchParams;  // reserved for future rec pre-selection

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Back button */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs gap-1">
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
      </div>

      {/* Ticker hero */}
      <div className="mx-4 mb-3 card px-4 py-3 shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#E8EAF0]">{ticker}</h1>
              <span className="text-[#4A5568] text-sm">{rec?.companyName ?? ticker}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span className="text-xl font-mono font-semibold text-[#E8EAF0]">
                ${fmtPrice(quote.price)}
              </span>
              <span className={`text-sm font-mono ${quote.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                {quote.change >= 0 ? '▲' : '▼'} ${Math.abs(quote.change).toFixed(2)} ({fmtPct(quote.changePct)})
              </span>
              <span className="text-xs text-[#4A5568]">NASDAQ</span>
              <span className="text-xs text-[#4A5568]">Mkt Cap: {quote.marketCap}</span>
              {quote.pe > 0 && <span className="text-xs text-[#4A5568]">P/E: {quote.pe}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn-ghost text-xs gap-1">
              <Star className="w-3.5 h-3.5" /> Watchlist
            </button>
            <button className="btn-ghost text-xs gap-1">
              <Bell className="w-3.5 h-3.5" /> Alert
            </button>
            <button className="btn-ghost text-xs gap-1">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            {rec && <SchwabButton recId={rec.id} optionSymbol={rec.optionSymbol ?? rec.schwabSymbol} />}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mx-4 mb-3 flex gap-1 border-b border-border shrink-0">
        {(['overview', 'chain', 'simulator', 'news'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px
                        ${tab === t
                          ? 'border-primary text-primary'
                          : 'border-transparent text-[#4A5568] hover:text-[#8892A4]'
                        }`}
          >
            {t === 'chain' ? 'Options Chain' : t === 'simulator' ? 'P&L Simulator' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'overview' && <OverviewTab ticker={ticker} quote={quote} rec={rec} />}
        {tab === 'chain'     && <ChainTab chain={chain} rec={rec} />}
        {tab === 'simulator' && rec && <SimulatorTab rec={rec} quote={quote} />}
        {tab === 'news'      && <NewsTab items={news} ticker={ticker} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ ticker, quote, rec }: { ticker: string; quote: typeof QUOTES[string]; rec: typeof mockRecommendations[0] | undefined }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Chart column */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* TradingView Chart */}
        <div className="card overflow-hidden">
          <Suspense fallback={<div className="h-72 flex items-center justify-center text-[#4A5568] text-xs">Loading chart...</div>}>
            <TradingViewChart ticker={ticker} height={288} />
          </Suspense>
        </div>

        {/* Key metrics */}
        <div className="card px-4 py-3">
          <div className="text-xs font-semibold text-[#8892A4] uppercase tracking-wide mb-2">Key Metrics</div>
          <div className="grid grid-cols-3 gap-4 font-mono text-xs">
            {rec && <>
              <div>
                <div className="text-[#4A5568]">IV</div>
                <div className="text-[#E8EAF0] font-semibold">{fmtIv(rec.iv)}</div>
              </div>
              <div>
                <div className="text-[#4A5568]">IV Rank</div>
                <div className="text-[#E8EAF0] font-semibold">{rec.ivRank}</div>
              </div>
            </>}
            <div>
              <div className="text-[#4A5568]">Volume</div>
              <div className="text-[#E8EAF0] font-semibold">{fmtVolume(quote.volume)}</div>
            </div>
            {quote.pe > 0 && (
              <div>
                <div className="text-[#4A5568]">P/E</div>
                <div className="text-[#E8EAF0] font-semibold">{quote.pe}</div>
              </div>
            )}
            <div>
              <div className="text-[#4A5568]">52W High</div>
              <div className="text-[#E8EAF0] font-semibold">${quote.high52}</div>
            </div>
            <div>
              <div className="text-[#4A5568]">52W Low</div>
              <div className="text-[#E8EAF0] font-semibold">${quote.low52}</div>
            </div>
          </div>
        </div>

        {/* Greeks */}
        {rec && (
          <div className="card px-4 py-3">
            <div className="text-xs font-semibold text-[#8892A4] uppercase tracking-wide mb-2">
              Greeks (for {rec.strike}{rec.optionType === 'call' ? 'C' : 'P'})
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#4A5568]">Delta</span>
                <span className="text-[#E8EAF0]">+0.42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5568]">Gamma</span>
                <span className="text-[#E8EAF0]">+0.08</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5568]">Theta</span>
                <span className="text-bear">-$0.18/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5568]">Vega</span>
                <span className="text-bull">+$0.31</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4A5568]">Rho</span>
                <span className="text-[#E8EAF0]">+$0.04</span>
              </div>
            </div>
          </div>
        )}

        {/* Catalysts */}
        {rec && rec.catalysts.length > 0 && (
          <div className="card px-4 py-3">
            <div className="text-xs font-semibold text-[#8892A4] uppercase tracking-wide mb-2">Upcoming Catalysts</div>
            <div className="flex flex-col gap-2">
              {rec.catalysts.map((c) => (
                <div key={c.date} className="flex items-center gap-2 text-xs">
                  <span className="text-lg">{c.type === 'earnings' ? '⚡' : c.type === 'fomc' ? '📊' : '📅'}</span>
                  <span className="text-[#4A5568]">{new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-[#8892A4]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {rec && (
          <>
            {/* Recommendation card inline */}
            <div className="card px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-bull">🔥 TOP PICK</span>
                <span className="text-xs font-semibold text-[#E8EAF0]">
                  {ticker} {new Date(rec.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${rec.strike} {rec.optionType === 'call' ? 'Call' : 'Put'}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-bull mb-1">Score: {rec.score}/100</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono mb-2">
                <div><span className="text-[#4A5568]">Ask: </span><span>${fmtPrice(rec.ask)}</span></div>
                <div><span className="text-[#4A5568]">Break: </span><span>${fmtPrice(rec.breakeven)}</span></div>
                <div><span className="text-[#4A5568]">Max Loss: </span><span className="text-bear">${rec.maxLoss}/contract</span></div>
                <div><span className="text-[#4A5568]">Max Gain: </span><span className="text-bull">{rec.maxProfit == null ? 'Unlimited' : `$${rec.maxProfit}`}</span></div>
              </div>
              <SchwabButton recId={rec.id} optionSymbol={rec.optionSymbol ?? rec.schwabSymbol} className="w-full justify-center" />
            </div>

            {/* Signal breakdown */}
            <div className="card px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#E8EAF0]">APHELION Score: {rec.score}/100</span>
                <span className="text-xs font-mono" style={{ color: scoreColor(rec.score) }}>{rec.score}/100</span>
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(rec.signals).map(([key, val]) => {
                  const labels: Record<string, string> = {
                    momentum: 'Momentum', ivAnalysis: 'IV Analysis',
                    newsSentiment: 'News Sentiment', earningsRisk: 'Earnings Risk',
                    technicalSetup: 'Technical Setup', optionsFlow: 'Options Flow',
                  };
                  const arrow = val >= 70 ? '↑' : val >= 40 ? '→' : '↓';
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <ScoreBar score={val} label={labels[key]} height="h-1" />
                      <span className={`text-[10px] w-3 ${val >= 70 ? 'text-bull' : val >= 40 ? 'text-warning' : 'text-bear'}`}>
                        {arrow}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thesis */}
            <div className="card px-4 py-3">
              <div className="text-xs font-semibold text-[#8892A4] uppercase tracking-wide mb-2">Thesis (Auto-generated)</div>
              <p className="text-xs text-[#8892A4] leading-relaxed">{rec.thesis}</p>
              {rec.risk && (
                <p className="text-xs text-warning mt-2">⚠️ {rec.risk}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Options Chain Tab ────────────────────────────────────────────────────────
function ChainTab({ chain, rec }: { chain: typeof mockAaplChain[0]; rec: typeof mockRecommendations[0] | undefined }) {
  const [showType, setShowType] = useState<'both' | 'calls' | 'puts'>('both');
  const calls = chain.chain.filter((r) => r.type === 'call');
  const puts  = chain.chain.filter((r) => r.type === 'put');
  const strikes = [...new Set(chain.chain.map((r) => r.strike))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="card px-4 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#4A5568]">Expiration:</span>
          <select className="bg-app border border-border rounded-sm px-2 py-1 text-xs text-[#E8EAF0]">
            <option>Apr 18 ●</option>
            <option>May 16</option>
            <option>Jun 20</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          {(['both', 'calls', 'puts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setShowType(t)}
              className={`btn text-[10px] py-1 px-2 ${showType === t ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#4A5568] hover:text-[#8892A4]'}`}
            >
              {t === 'both' ? 'Calls + Puts' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#4A5568]">
          DTE: {chain.dte}d · IV: {rec ? fmtIv(rec.iv) : '—'}
        </div>
      </div>

      {/* Chain table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border">
              {(showType === 'both' || showType === 'calls') && <>
                <th className="px-3 py-2.5 text-right text-[#4A5568] text-[10px]">OI</th>
                <th className="px-3 py-2.5 text-right text-[#4A5568] text-[10px]">Vol</th>
                <th className="px-3 py-2.5 text-right text-[#4A5568] text-[10px]">Bid</th>
                <th className="px-3 py-2.5 text-right text-[#4A5568] text-[10px]">Ask</th>
                <th className="px-3 py-2.5 text-right text-[#4A5568] text-[10px]">Δ</th>
              </>}
              <th className="px-3 py-2.5 text-center bg-hover text-[#8892A4] text-[10px] font-bold">STRIKE</th>
              {(showType === 'both' || showType === 'puts') && <>
                <th className="px-3 py-2.5 text-left text-[#4A5568] text-[10px]">Δ</th>
                <th className="px-3 py-2.5 text-left text-[#4A5568] text-[10px]">Ask</th>
                <th className="px-3 py-2.5 text-left text-[#4A5568] text-[10px]">Bid</th>
                <th className="px-3 py-2.5 text-left text-[#4A5568] text-[10px]">Vol</th>
                <th className="px-3 py-2.5 text-left text-[#4A5568] text-[10px]">OI</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike) => {
              const c = calls.find((r) => r.strike === strike);
              const p = puts.find((r) => r.strike === strike);
              const isRec = rec?.strike === strike;
              const isITM_c = c?.isItm;
              const isITM_p = p?.isItm;

              return (
                <tr
                  key={strike}
                  className={`border-b border-border/30 transition-colors
                    ${isRec ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
                    hover:bg-hover/50`}
                >
                  {/* Calls */}
                  {(showType === 'both' || showType === 'calls') && c ? <>
                    <td className={`px-3 py-2 text-right ${isITM_c ? 'text-bull/70' : 'text-[#4A5568]'}`}>{(c.oi / 1000).toFixed(1)}k</td>
                    <td className={`px-3 py-2 text-right ${isITM_c ? 'text-bull/70' : 'text-[#4A5568]'}`}>{(c.volume / 1000).toFixed(1)}k</td>
                    <td className={`px-3 py-2 text-right ${isITM_c ? 'text-bull' : 'text-[#8892A4]'}`}>{c.bid.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${isRec ? 'text-primary' : isITM_c ? 'text-bull' : 'text-[#E8EAF0]'}`}>{c.ask.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-bull">+{c.delta.toFixed(2)}</td>
                  </> : (showType === 'both' || showType === 'calls') ? <td colSpan={5} /> : null}

                  {/* Strike */}
                  <td className={`px-3 py-2 text-center font-bold bg-hover/50
                                  ${isRec ? 'text-primary' : 'text-[#E8EAF0]'}`}>
                    ${strike}
                    {isRec && <span className="ml-1 text-[10px] text-primary">←●</span>}
                  </td>

                  {/* Puts */}
                  {(showType === 'both' || showType === 'puts') && p ? <>
                    <td className="px-3 py-2 text-left text-bear">{p.delta.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-left font-semibold ${isITM_p ? 'text-bear' : 'text-[#8892A4]'}`}>{p.ask.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-left ${isITM_p ? 'text-bear/70' : 'text-[#4A5568]'}`}>{p.bid.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-left ${isITM_p ? 'text-bear/70' : 'text-[#4A5568]'}`}>{(p.volume / 1000).toFixed(1)}k</td>
                    <td className={`px-3 py-2 text-left ${isITM_p ? 'text-bear/70' : 'text-[#4A5568]'}`}>{(p.oi / 1000).toFixed(1)}k</td>
                  </> : (showType === 'both' || showType === 'puts') ? <td colSpan={5} /> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rec && (
        <div className="card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs">
            <span className="text-[#4A5568]">Selected: </span>
            <span className="text-[#E8EAF0] font-semibold">
              {rec.ticker} {new Date(rec.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${rec.strike} {rec.optionType === 'call' ? 'Call' : 'Put'}
            </span>
            <span className="text-[#4A5568] mx-2">|</span>
            <span className="text-[#4A5568]">Ask: </span>
            <span className="text-[#E8EAF0] font-mono">${fmtPrice(rec.ask)}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs">Use in P&L Simulator →</button>
            <SchwabButton recId={rec.id} optionSymbol={rec.optionSymbol ?? rec.schwabSymbol} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── P&L Simulator Tab ────────────────────────────────────────────────────────
function SimulatorTab({ rec, quote }: { rec: typeof mockRecommendations[0]; quote: typeof QUOTES[string] }) {
  const [targetPrice, setTargetPrice] = useState(quote.price);
  const [dteTarget,   setDteTarget]   = useState(Math.floor(rec.dte / 2));
  const [ivChange,    setIvChange]    = useState(0);

  const result = estimatePnl({
    type: rec.optionType,
    strike: rec.strike,
    ask: rec.ask,
    currentPrice: quote.price,
    targetPrice,
    dteNow: rec.dte,
    dteTarget,
    ivNow: rec.iv,
    ivChange,
  });

  const scenarios = [
    { label: 'Bull Run',          stockDeltaPct:  5, dteLeft: 30, ivChangePct: 0   },
    { label: 'Current Settings',  stockDeltaPct: (targetPrice - quote.price) / quote.price * 100, dteLeft: dteTarget, ivChangePct: ivChange },
    { label: 'IV Crush (post-E)', stockDeltaPct:  3, dteLeft: 10, ivChangePct: -30 },
    { label: 'Flat/No movement',  stockDeltaPct:  0, dteLeft: rec.dte, ivChangePct: 0 },
    { label: 'Max Loss',          stockDeltaPct: rec.optionType === 'call' ? -10 : 10, dteLeft: 0, ivChangePct: 0 },
  ].map((s) => {
    const tp = quote.price * (1 + s.stockDeltaPct / 100);
    const r = estimatePnl({ type: rec.optionType, strike: rec.strike, ask: rec.ask, currentPrice: quote.price, targetPrice: tp, dteNow: rec.dte, dteTarget: s.dteLeft, ivNow: rec.iv, ivChange: s.ivChangePct });
    return { ...s, ...r };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="card px-4 py-4">
        <h3 className="text-xs font-semibold text-[#8892A4] uppercase tracking-wide mb-4">
          P&L Simulator — {rec.ticker} {new Date(rec.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${rec.strike} {rec.optionType === 'call' ? 'Call' : 'Put'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stock price slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#4A5568]">Stock Price</span>
              <span className="text-xs font-mono text-[#E8EAF0]">${fmtPrice(targetPrice)}</span>
            </div>
            <input
              type="range"
              min={quote.price * 0.85} max={quote.price * 1.15}
              step={0.5}
              value={targetPrice}
              onChange={(e) => setTargetPrice(+e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-[#4A5568] mt-1">
              <span>${fmtPrice(quote.price * 0.85)}</span>
              <span>${fmtPrice(quote.price * 1.15)}</span>
            </div>
          </div>

          {/* DTE slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#4A5568]">Days to Exp</span>
              <span className="text-xs font-mono text-[#E8EAF0]">{dteTarget} DTE</span>
            </div>
            <input
              type="range"
              min={0} max={rec.dte}
              value={dteTarget}
              onChange={(e) => setDteTarget(+e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-[#4A5568] mt-1">
              <span>{rec.dte}d (now)</span>
              <span>0 (expiry)</span>
            </div>
          </div>

          {/* IV change */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#4A5568]">IV Change</span>
              <span className="text-xs font-mono text-[#E8EAF0]">{ivChange >= 0 ? '+' : ''}{ivChange}%</span>
            </div>
            <input
              type="range"
              min={-30} max={30}
              value={ivChange}
              onChange={(e) => setIvChange(+e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-[#4A5568] mt-1">
              <span>-30%</span>
              <span>+30%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Option Price',  value: `$${result.optionPrice}`, color: '#E8EAF0' },
          { label: 'P&L / Contract', value: `${result.pnl >= 0 ? '+' : ''}$${result.pnl}`, color: result.pnl >= 0 ? '#00E5A0' : '#FF4D6D' },
          { label: '% Return',      value: `${result.returnPct >= 0 ? '+' : ''}${result.returnPct}%`, color: result.returnPct >= 0 ? '#00E5A0' : '#FF4D6D' },
          { label: 'Breakeven (exp)', value: `$${fmtPrice(rec.breakeven)}`, color: '#6C8EEF' },
        ].map((m) => (
          <div key={m.label} className="card px-4 py-3">
            <div className="text-[10px] text-[#4A5568] uppercase tracking-wide mb-1">{m.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Scenario table */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-[#8892A4] uppercase tracking-wide">
          Scenario Comparison
        </div>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border/50 text-[#4A5568] text-[10px]">
              <th className="px-4 py-2 text-left">Scenario</th>
              <th className="px-4 py-2 text-right">Stock Δ</th>
              <th className="px-4 py-2 text-right">DTE Left</th>
              <th className="px-4 py-2 text-right">IV Δ</th>
              <th className="px-4 py-2 text-right">Est P&L</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.label} className="border-b border-border/30 hover:bg-hover/30">
                <td className="px-4 py-2.5 text-[#8892A4]">{s.label}</td>
                <td className={`px-4 py-2.5 text-right ${s.stockDeltaPct >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {s.stockDeltaPct >= 0 ? '+' : ''}{s.stockDeltaPct.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right text-[#8892A4]">{s.dteLeft}d</td>
                <td className={`px-4 py-2.5 text-right ${s.ivChangePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {s.ivChangePct >= 0 ? '+' : ''}{s.ivChangePct}%
                </td>
                <td className={`px-4 py-2.5 text-right font-bold ${s.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {s.pnl >= 0 ? '+' : ''}${s.pnl} ({s.returnPct >= 0 ? '+' : ''}{s.returnPct}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export symbol */}
      <div className="flex justify-end">
        <SchwabButton recId={rec.id} optionSymbol={rec.optionSymbol ?? rec.schwabSymbol} />
      </div>
    </div>
  );
}

// ─── News Tab ─────────────────────────────────────────────────────────────────
function NewsTab({ items, ticker }: { items: typeof mockNews; ticker: string }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const FILTERS = ['all', 'Analyst', 'Earnings', 'Options Flow', 'SEC', 'Social'];

  const filtered = items.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'Analyst') return n.tags.some((t) => t.includes('ANALYST') || t.includes('UPGRADE'));
    if (activeFilter === 'Earnings') return n.tags.includes('EARNINGS');
    if (activeFilter === 'Options Flow') return n.tags.includes('OPTIONS FLOW');
    return false;
  });

  return (
    <div className="card">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`btn text-[10px] py-1 px-2.5 shrink-0 ${
              activeFilter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#4A5568] hover:text-[#8892A4]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-[#4A5568] text-sm">No news for {ticker} in this category</div>
      ) : (
        filtered.map((item) => <NewsItem key={item.id} item={item} forceExpanded />)
      )}
    </div>
  );
}
