import type {
  Recommendation, NewsItem, AiDigest, SectorSentiment,
  WatchlistGroup, MarketStatus, OptionExpiry, CalculationDetails,
  SellSignal, ConfidenceBreakdown, BacktestStats,
  PortfolioPosition, PortfolioRiskMetrics
} from '../types';

// ─── Shared helper: compute Black-Scholes d1/d2 inline for mock data ──────────
function normCDF(x: number): number {
  const a = [0.31938153, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const L = Math.abs(x);
  const K = 1 / (1 + 0.2316419 * L);
  let w = 1 - 1 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) *
    (a[0]*K + a[1]*K**2 + a[2]*K**3 + a[3]*K**4 + a[4]*K**5);
  return x < 0 ? 1 - w : w;
}

function buildCalc(
  S: number,    // underlying price
  K: number,    // strike
  T: number,    // time to expiry in years
  r: number,    // risk-free rate
  sigma: number, // implied vol
  premium: number,
  type: 'call' | 'put',
  hvol: number,
  strikeReason: string,
): CalculationDetails {
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const nd1 = normCDF(d1), nd2 = normCDF(d2);
  const nNd1 = normCDF(-d1), nNd2 = normCDF(-d2);

  const theoreticalPrice = type === 'call'
    ? S * nd1 - K * Math.exp(-r * T) * nd2
    : K * Math.exp(-r * T) * nNd2 - S * nNd1;

  // Greeks
  const phi_d1 = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
  const delta  = type === 'call' ? nd1 : nd1 - 1;
  const gamma  = phi_d1 / (S * sigma * sqrtT);
  const theta  = type === 'call'
    ? (-(S * phi_d1 * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * nd2) / 365
    : (-(S * phi_d1 * sigma) / (2 * sqrtT) + r * K * Math.exp(-r * T) * nNd2) / 365;
  const vega = S * phi_d1 * sqrtT / 100;
  const rho  = type === 'call'
    ? K * T * Math.exp(-r * T) * nd2 / 100
    : -K * T * Math.exp(-r * T) * nNd2 / 100;

  const breakevenPrice = type === 'call' ? K + premium : K - premium;
  const breakevenFormula = type === 'call'
    ? `Strike + Premium = $${K} + $${premium.toFixed(2)} = $${breakevenPrice.toFixed(2)}`
    : `Strike − Premium = $${K} − $${premium.toFixed(2)} = $${breakevenPrice.toFixed(2)}`;
  const pop = type === 'call' ? (1 - nd2) * 100 : nd2 * 100; // simplified approximation
  const profitTargetPct = 50;
  const stopLossPct     = 50;
  const sellTarget = +(premium * (1 + profitTargetPct / 100)).toFixed(2);
  const stopLoss   = +(premium * (1 - stopLossPct / 100)).toFixed(2);
  const maxLoss    = premium * 100;
  const ivVsHvSpread = sigma - hvol;
  const exp = new Date(Date.now() + T * 365 * 24 * 60 * 60 * 1000);
  const expStr = `${(exp.getMonth()+1).toString().padStart(2,'0')}/${exp.getDate().toString().padStart(2,'0')}/${exp.getFullYear()}`;

  return {
    model: 'Black-Scholes',
    inputs: {
      underlyingPrice: S,
      strikePrice: K,
      impliedVol: sigma,
      historicalVol: hvol,
      timeToExpiryYears: +T.toFixed(6),
      riskFreeRate: r,
      premium,
    },
    intermediate: {
      d1: +d1.toFixed(6),
      d2: +d2.toFixed(6),
      nd1: +nd1.toFixed(6),
      nd2: +nd2.toFixed(6),
      theoreticalPrice: +theoreticalPrice.toFixed(4),
      ivVsHvSpread: +ivVsHvSpread.toFixed(4),
      ivVsHvLabel: `IV is ${(Math.abs(ivVsHvSpread) * 100).toFixed(1)}% ${ivVsHvSpread > 0 ? 'ABOVE' : 'BELOW'} 30-day HV (${(hvol*100).toFixed(1)}%) — ${ivVsHvSpread > 0.05 ? 'elevated premium; consider selling instead' : ivVsHvSpread < -0.05 ? 'options are cheap; favorable for buying' : 'IV roughly in line with HV'}`,
    },
    greeks: {
      delta: +delta.toFixed(4),
      gamma: +gamma.toFixed(6),
      theta: +theta.toFixed(4),
      vega:  +vega.toFixed(4),
      rho:   +rho.toFixed(4),
    },
    output: {
      breakevenPrice: +breakevenPrice.toFixed(2),
      breakevenFormula,
      probabilityOfProfit: +pop.toFixed(2),
      expectedReturn: +(pop / 100 * sellTarget * 100 - (1 - pop / 100) * maxLoss).toFixed(2),
      maxLoss: +maxLoss.toFixed(2),
      maxProfit: type === 'call' ? null : +(K * 100 - premium * 100).toFixed(2),
      riskRewardRatio: `1:${(sellTarget / stopLoss).toFixed(1)}`,
    },
    strikeSelectionReason: strikeReason,
    tradeSignals: {
      buyAt: +premium.toFixed(2),
      sellTarget,
      stopLoss,
      breakeven: +breakevenPrice.toFixed(2),
      expiration: expStr,
      dte: Math.round(T * 365),
      profitTargetPct,
      stopLossPct,
    },
  };
}

// ─── Market Status ────────────────────────────────────────────────────────────
export const mockMarketStatus: MarketStatus = {
  session: 'open',
  spy:  { ticker: 'SPY',  price: 598.23, change: 2.41,  changePct: 0.40,  volume: 82_000_000 },
  qqq:  { ticker: 'QQQ',  price: 512.10, change: -0.51, changePct: -0.10, volume: 41_000_000 },
  vix:  { ticker: 'VIX',  price: 18.40,  change: 0.91,  changePct: 5.20,  volume: 0 },
  lastSync: new Date(Date.now() - 8000).toISOString(),
  newRecCount: 4,
  newArticleCount: 12,
};

// ─── Recommendations ─────────────────────────────────────────────────────────
export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-aapl-apr-195c',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    strategy: 'long_call',
    strike: 195,
    expiry: '2026-04-18',
    dte: 37,
    optionType: 'call',
    score: 87,
    conviction: 'high',
    ask: 2.45,
    breakeven: 197.45,
    maxLoss: 245,
    maxProfit: null,
    estimatedPnl: 340,
    ivRank: 68,
    iv: 0.26,
    signals: {
      momentum: 78, ivAnalysis: 70, newsSentiment: 88,
      earningsRisk: 40, technicalSetup: 80, optionsFlow: 72,
    },
    thesis: 'Strong momentum confirmed by MA breakout. IV Rank at 68 — elevated but not overpriced for calls. Goldman upgrade + $5M sweep confirm institutional bullish bias. Earnings Apr 9 is a binary risk — consider position sizing accordingly.',
    whyNow: 'GS upgrade + call sweep + IV rank elevated → favorable setup',
    risk: 'Earnings Apr 9 (pre-exp binary event)',
    catalysts: [
      { date: '2026-04-09', label: 'Q2 Earnings',     type: 'earnings' },
      { date: '2026-04-04', label: 'Spring product event', type: 'product' },
      { date: '2026-03-18', label: 'FOMC (indirect)',  type: 'fomc' },
    ],
    linkedNewsIds: ['news-gs-aapl', 'news-aapl-sweep'],
    schwabSymbol: '.AAPL260418C195',
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    calculationDetails: buildCalc(
      190.50, 195, 37/365, 0.053, 0.26, 2.45, 'call', 0.21,
      '$195 strike selected: ~0.35 delta OTM call, approximately 2.4% above current price ($190.50). ' +
      'This strike offers favorable risk/reward: low enough premium to reduce cost basis while still capturing ' +
      'meaningful upside if AAPL moves to all-time highs post-earnings. Avoids deep ITM (expensive, less leverage) ' +
      'and far OTM (lottery ticket). GS price target of $215 makes this strike achievable within DTE.'
    ),
  },
  {
    id: 'rec-nvda-may-900c',
    ticker: 'NVDA',
    companyName: 'Nvidia Corp',
    strategy: 'long_call',
    strike: 900,
    expiry: '2026-05-16',
    dte: 65,
    optionType: 'call',
    score: 83,
    conviction: 'high',
    ask: 8.10,
    breakeven: 908.10,
    maxLoss: 810,
    maxProfit: null,
    estimatedPnl: 510,
    ivRank: 74,
    iv: 0.38,
    signals: {
      momentum: 82, ivAnalysis: 75, newsSentiment: 91,
      earningsRisk: 20, technicalSetup: 85, optionsFlow: 68,
    },
    thesis: 'Earnings beat removes uncertainty. IV likely to contract post-announce. Strong momentum continuing into AI demand cycle.',
    whyNow: 'Earnings beat + institutional momentum + IV favorable for May calls',
    risk: undefined,
    catalysts: [
      { date: '2026-04-22', label: 'GTC Conference', type: 'event' },
    ],
    linkedNewsIds: ['news-nvda-earnings'],
    schwabSymbol: '.NVDA260516C900',
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    calculationDetails: buildCalc(
      872.50, 900, 65/365, 0.053, 0.38, 8.10, 'call', 0.32,
      '$900 strike selected: ~0.38 delta call, roughly 3.1% above current price ($872.50). ' +
      'Earnings catalyst has passed; IV crush risk reduced. 65 DTE provides enough time for post-earnings momentum ' +
      'to develop. $900 is a key psychological level and prior resistance — a breakout above it signals continuation. ' +
      'IV rank of 74 is elevated, but with earnings behind us, May calls capture the full AI conference cycle (GTC Apr 22). ' +
      'Position sizing: 1-2 contracts max given $810 max-loss per contract.'
    ),
  },
  {
    id: 'rec-spy-apr-580p',
    ticker: 'SPY',
    companyName: 'S&P 500 ETF',
    strategy: 'long_put',
    strike: 580,
    expiry: '2026-04-04',
    dte: 23,
    optionType: 'put',
    score: 76,
    conviction: 'medium',
    ask: 3.20,
    breakeven: 576.80,
    maxLoss: 320,
    maxProfit: 57680,
    estimatedPnl: 180,
    ivRank: 55,
    iv: 0.19,
    signals: {
      momentum: 65, ivAnalysis: 60, newsSentiment: 72,
      earningsRisk: 0, technicalSetup: 75, optionsFlow: 58,
    },
    thesis: 'Fed hold removes rate cut catalyst. VIX spike above 20 signals hedging conditions. Put offers downside protection while macro uncertainty persists.',
    whyNow: 'Fed hold + VIX spike = put opportunity',
    risk: 'Opportunity cost if equities rally on positive data',
    catalysts: [
      { date: '2026-03-18', label: 'FOMC decision', type: 'fomc' },
    ],
    linkedNewsIds: ['news-fed-hold', 'news-vix-spike'],
    schwabSymbol: '.SPY260404P580',
    createdAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    calculationDetails: buildCalc(
      598.23, 580, 23/365, 0.053, 0.19, 3.20, 'put', 0.16,
      '$580 put selected: ~3% OTM from current SPY price ($598.23). Targets the 200-day MA support zone at $578-$582. ' +
      'If macro deteriorates post-FOMC hold, $580 is the first major structural support. A break below $580 on volume ' +
      'would signal broader market weakness. Avoids ATM puts (expensive, less leverage on a move) while still capturing ' +
      'meaningful directional exposure. 23 DTE aligns with FOMC date (Mar 18) giving 5 days of post-decision resolution.'
    ),
  },
  {
    id: 'rec-meta-may-580c',
    ticker: 'META',
    companyName: 'Meta Platforms',
    strategy: 'long_call',
    strike: 580,
    expiry: '2026-05-16',
    dte: 65,
    optionType: 'call',
    score: 71,
    conviction: 'medium',
    ask: 4.60,
    breakeven: 584.60,
    maxLoss: 460,
    maxProfit: null,
    estimatedPnl: 220,
    ivRank: 48,
    iv: 0.31,
    signals: {
      momentum: 70, ivAnalysis: 55, newsSentiment: 74,
      earningsRisk: 35, technicalSetup: 72, optionsFlow: 50,
    },
    thesis: 'AI video product launch provides catalyst. IV not elevated — call premium reasonable. Momentum holding above key support.',
    whyNow: 'AI video release + reasonable IV setup',
    risk: undefined,
    catalysts: [
      { date: '2026-04-29', label: 'Q1 Earnings', type: 'earnings' },
    ],
    linkedNewsIds: ['news-meta-ai'],
    schwabSymbol: '.META260516C580',
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
];

// ─── News ─────────────────────────────────────────────────────────────────────
export const mockNews: NewsItem[] = [
  {
    id: 'news-fed-hold',
    headline: 'Fed holds rates at 5.25-5.50% — confirms pause through Q2',
    summary: 'The Federal Reserve unanimously voted to hold the federal funds rate steady, signaling a pause through at least Q2 2026.',
    source: 'Reuters',
    publishedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    impact: 'breaking',
    sentiment: 'neutral',
    tickers: ['SPY', 'TLT', 'GLD', 'DXY'],
    tags: ['RATES', 'MACRO', 'FED'],
    triggeredRecs: [{ recId: 'rec-spy-apr-580p', ticker: 'SPY', label: 'SPY Apr 580P', score: 76, rank: 3 }],
  },
  {
    id: 'news-nvda-earnings',
    headline: 'NVDA Q4 beats estimates by 18% — data center revenue surges',
    summary: 'Nvidia reported Q4 revenue of $22.1B vs $18.8B expected, driven by record data center demand for H100 chips.',
    source: 'Bloomberg',
    publishedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    impact: 'high',
    sentiment: 'bullish',
    tickers: ['NVDA', 'AMD', 'SMCI'],
    tags: ['EARNINGS', 'SEMIS', 'AI'],
    triggeredRecs: [{ recId: 'rec-nvda-may-900c', ticker: 'NVDA', label: 'NVDA May 900C', score: 83, rank: 2 }],
  },
  {
    id: 'news-vix-spike',
    headline: 'VIX spikes above 20 on macro uncertainty — hedging conditions elevated',
    summary: 'The VIX volatility index broke above 20 for the first time since January, driven by Fed uncertainty and geopolitical tensions.',
    source: 'CNBC',
    publishedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    impact: 'med',
    sentiment: 'bearish',
    tickers: ['VIX', 'SPY', 'QQQ'],
    tags: ['VIX', 'MACRO', 'VOLATILITY'],
    triggeredRecs: [],
  },
  {
    id: 'news-tsla-china',
    headline: 'TSLA China Q1 sales miss — deliveries down 12% year-over-year',
    summary: 'Tesla reported weaker-than-expected China Q1 delivery numbers, declining amid intensifying competition from BYD.',
    source: 'Reuters',
    publishedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    impact: 'high',
    sentiment: 'bearish',
    tickers: ['TSLA'],
    tags: ['EARNINGS', 'EV', 'CHINA'],
    triggeredRecs: [],
  },
  {
    id: 'news-meta-ai',
    headline: 'META releases AI video generation tool — competes directly with Sora',
    summary: 'Meta unveiled its new AI video model, capable of generating high-quality 60-second clips from text prompts.',
    source: 'The Verge',
    publishedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    impact: 'med',
    sentiment: 'bullish',
    tickers: ['META', 'GOOGL'],
    tags: ['AI', 'TECH'],
    triggeredRecs: [{ recId: 'rec-meta-may-580c', ticker: 'META', label: 'META May 580C', score: 71, rank: 4 }],
  },
  {
    id: 'news-gs-aapl',
    headline: 'Goldman Sachs upgrades AAPL to Buy, raises PT $185 → $215',
    summary: '"Services growth acceleration + AI cycle ramp justify premium multiple" — GS raises price target and adds to conviction list.',
    source: 'Goldman Sachs',
    publishedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
    impact: 'high',
    sentiment: 'bullish',
    tickers: ['AAPL'],
    tags: ['ANALYST', 'UPGRADE', 'AI'],
    triggeredRecs: [{ recId: 'rec-aapl-apr-195c', ticker: 'AAPL', label: 'AAPL Apr 195C', score: 87, rank: 1 }],
  },
  {
    id: 'news-aapl-sweep',
    headline: 'Unusual: $5M+ in Apr 200C purchased at ask — 3 sweeps detected',
    summary: 'Large institutional options flow detected on AAPL April expiry calls, suggesting bullish positioning ahead of potential catalyst.',
    source: 'Unusual Whales',
    publishedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    impact: 'high',
    sentiment: 'bullish',
    tickers: ['AAPL'],
    tags: ['OPTIONS FLOW', 'INSTITUTIONAL'],
    triggeredRecs: [{ recId: 'rec-aapl-apr-195c', ticker: 'AAPL', label: 'AAPL Apr 195C', score: 87, rank: 1 }],
  },
  {
    id: 'news-msft-sweep',
    headline: 'Unusual options: $12M sweep detected in MSFT calls',
    summary: 'Significant call options activity in Microsoft, suggesting institutional positioning ahead of earnings.',
    source: 'Unusual Whales',
    publishedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    impact: 'med',
    sentiment: 'bullish',
    tickers: ['MSFT'],
    tags: ['OPTIONS FLOW'],
    triggeredRecs: [],
  },
];

// ─── AI Digest ────────────────────────────────────────────────────────────────
export const mockAiDigest: AiDigest = {
  generatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  entries: [
    {
      ticker: 'AAPL',
      bias: 'bullish',
      summary: '3 bullish signals in last 24h: analyst upgrade, options flow, supply chain news. Pre-earnings caution Apr 9.',
      linkedRecId: 'rec-aapl-apr-195c',
      linkedRecLabel: 'AAPL Apr 195C',
    },
    {
      ticker: 'NVDA',
      bias: 'bullish',
      summary: 'Earnings beat removes uncertainty. IV likely to contract. Watch 900C for May expiry.',
      linkedRecId: 'rec-nvda-may-900c',
      linkedRecLabel: 'NVDA May 900C',
    },
    {
      ticker: 'TLT',
      bias: 'neutral',
      summary: 'Fed hold removes rate cut catalyst. Watch 10Y yield for direction. No entry signal yet.',
      linkedRecId: undefined,
    },
  ],
};

// ─── Sector Sentiment ─────────────────────────────────────────────────────────
export const mockSectors: SectorSentiment[] = [
  { name: 'Tech',    score:  0.72, bias: 'bullish',  changePct:  2.1 },
  { name: 'Finance', score:  0.45, bias: 'bullish',  changePct:  1.0 },
  { name: 'Energy',  score:  0.08, bias: 'neutral',  changePct:  3.0 },
  { name: 'Health',  score: -0.31, bias: 'bearish',  changePct: -1.0 },
  { name: 'Macro',   score: -0.55, bias: 'bearish',  changePct: -0.5 },
];

// ─── Watchlists ───────────────────────────────────────────────────────────────
export const mockWatchlists: WatchlistGroup[] = [
  {
    id: 'wl-tech',
    name: 'Tech Plays',
    items: [
      { ticker: 'AAPL',  companyName: 'Apple Inc.',     price: 191.42, changePct:  2.03, topRecScore: 87, topRecConviction: 'high',   ivRank: 68 },
      { ticker: 'NVDA',  companyName: 'Nvidia Corp',    price: 875.40, changePct:  0.82, topRecScore: 83, topRecConviction: 'high',   ivRank: 74 },
      { ticker: 'META',  companyName: 'Meta Platforms', price: 562.80, changePct:  1.10, topRecScore: 71, topRecConviction: 'medium', ivRank: 48 },
      { ticker: 'GOOGL', companyName: 'Alphabet Inc.',  price: 172.30, changePct:  0.95, topRecScore: 68, topRecConviction: 'medium', ivRank: 42 },
      { ticker: 'MSFT',  companyName: 'Microsoft Corp', price: 415.60, changePct: -0.22, topRecScore: 65, topRecConviction: 'medium', ivRank: 39 },
    ],
    alerts: [
      { id: 'al-1', ticker: 'AAPL', condition: 'IV Rank > 70', isActive: true  },
      { id: 'al-2', ticker: 'NVDA', condition: 'Price > 900',  isActive: false },
    ],
  },
  {
    id: 'wl-macro',
    name: 'Macro Hedges',
    items: [
      { ticker: 'SPY', companyName: 'S&P 500 ETF',   price: 598.23, changePct:  0.40, topRecScore: 76, topRecConviction: 'medium', ivRank: 55 },
      { ticker: 'QQQ', companyName: 'Nasdaq ETF',    price: 512.10, changePct: -0.10 },
      { ticker: 'TLT', companyName: '20Y Treasury',  price: 92.40,  changePct:  0.61 },
    ],
    alerts: [
      { id: 'al-3', ticker: 'VIX', condition: 'VIX > 20', isActive: true },
    ],
  },
];

// ─── Options Chain (AAPL example) ─────────────────────────────────────────────
export const mockAaplChain: OptionExpiry[] = [
  {
    date: '2026-04-18',
    dte: 37,
    chain: [
      { strike: 185, expiry: '2026-04-18', type: 'call', bid: 7.20, ask: 7.35, iv: 0.28, delta:  0.72, oi: 8400,  volume: 1200, isItm: true  },
      { strike: 190, expiry: '2026-04-18', type: 'call', bid: 3.80, ask: 3.95, iv: 0.27, delta:  0.58, oi: 12100, volume: 2100, isItm: true  },
      { strike: 195, expiry: '2026-04-18', type: 'call', bid: 1.85, ask: 2.00, iv: 0.26, delta:  0.42, oi: 15200, volume: 3300, isRecommended: true },
      { strike: 200, expiry: '2026-04-18', type: 'call', bid: 0.75, ask: 0.85, iv: 0.25, delta:  0.28, oi: 9800,  volume: 1800  },
      { strike: 205, expiry: '2026-04-18', type: 'call', bid: 0.25, ask: 0.32, iv: 0.24, delta:  0.14, oi: 6100,  volume: 900   },
      // Puts
      { strike: 185, expiry: '2026-04-18', type: 'put',  bid: 1.05, ask: 1.15, iv: 0.30, delta: -0.28, oi: 4200,  volume: 800   },
      { strike: 190, expiry: '2026-04-18', type: 'put',  bid: 2.40, ask: 2.55, iv: 0.28, delta: -0.42, oi: 7800,  volume: 1400  },
      { strike: 195, expiry: '2026-04-18', type: 'put',  bid: 4.20, ask: 4.35, iv: 0.27, delta: -0.58, oi: 5100,  volume: 2100  },
      { strike: 200, expiry: '2026-04-18', type: 'put',  bid: 7.30, ask: 7.45, iv: 0.28, delta: -0.72, oi: 3400,  volume: 1100, isItm: true },
      { strike: 205, expiry: '2026-04-18', type: 'put',  bid:11.00, ask:11.20, iv: 0.30, delta: -0.85, oi: 1800,  volume: 400,  isItm: true },
    ],
  },
];

export const trendingTickers = [
  { ticker: 'NVDA', articleCount: 47 },
  { ticker: 'AAPL', articleCount: 31 },
  { ticker: 'TSLA', articleCount: 22 },
  { ticker: 'SPY',  articleCount: 18 },
  { ticker: 'META', articleCount: 14 },
];
