// ─── Market & Price ───────────────────────────────────────────────────────────

export interface QuoteData {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  week52High?: number;
  week52Low?: number;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface OptionChainRow {
  strike: number;
  expiry: string;          // ISO date
  type: 'call' | 'put';
  bid: number;
  ask: number;
  iv: number;              // decimal e.g. 0.26
  delta: number;
  oi: number;              // open interest
  volume: number;
  isRecommended?: boolean;
  isItm?: boolean;
}

export interface OptionExpiry {
  date: string;            // ISO date
  dte: number;
  chain: OptionChainRow[];
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export type ConvictionLevel = 'high' | 'medium' | 'low';
export type OptionStrategy = 'long_call' | 'long_put' | 'bull_spread' | 'bear_spread' | 'naked_call' | 'naked_put';

export interface SignalBreakdown {
  momentum:       number;   // 0-100
  ivAnalysis:     number;
  newsSentiment:  number;
  earningsRisk:   number;
  technicalSetup: number;
  optionsFlow:    number;
}

export interface Recommendation {
  id: string;
  ticker: string;
  companyName: string;
  strategy: OptionStrategy;
  strike: number;
  expiry: string;          // ISO date
  dte: number;
  optionType: 'call' | 'put';
  score: number;           // 0-100
  conviction: ConvictionLevel;
  ask: number;
  breakeven: number;
  maxLoss: number;
  maxProfit: number | null; // null = unlimited
  estimatedPnl: number;
  ivRank: number;          // 0-100
  iv: number;              // decimal
  signals: SignalBreakdown;
  thesis: string;
  whyNow: string;
  risk?: string;
  catalysts: CatalystItem[];
  linkedNewsIds: string[];
  schwabSymbol: string;    // OCC-format symbol for Schwab (legacy field, prefer optionSymbol)
  optionSymbol?: string;   // OCC format for Schwab: e.g. AAPL  260418C00195000
  createdAt: string;
  isSaved?: boolean;
  isActedOn?: boolean;
}

// ─── News ─────────────────────────────────────────────────────────────────────

export type NewsImpact = 'high' | 'med' | 'low' | 'breaking';
export type NewsSentiment = 'bullish' | 'mildly_bullish' | 'neutral' | 'mildly_bearish' | 'bearish';
export type NewsSource = 'Reuters' | 'Bloomberg' | 'CNBC' | 'WSJ' | 'Goldman Sachs' | 'Benzinga' | 'SEC' | 'Unusual Whales' | 'The Verge' | 'Morgan Stanley' | 'Official';

export interface TriggeredRec {
  recId: string;
  ticker: string;
  label: string;    // e.g. "SPY Apr 580P"
  score: number;
  rank?: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary?: string;
  source: NewsSource;
  publishedAt: string;     // ISO
  impact: NewsImpact;
  sentiment: NewsSentiment;
  tickers: string[];
  tags: string[];
  url?: string;
  triggeredRecs: TriggeredRec[];
  isRead?: boolean;
  isSaved?: boolean;
}

// ─── AI Digest ────────────────────────────────────────────────────────────────

export type DigestBias = 'bullish' | 'neutral' | 'bearish';

export interface DigestEntry {
  ticker: string;
  bias: DigestBias;
  summary: string;
  linkedRecId?: string;
  linkedRecLabel?: string;
}

export interface AiDigest {
  generatedAt: string;
  entries: DigestEntry[];
}

// ─── Sectors ─────────────────────────────────────────────────────────────────

export interface SectorSentiment {
  name: string;
  score: number;     // -1 to 1
  bias: DigestBias;
  changePct: number;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  ticker: string;
  companyName: string;
  price: number;
  changePct: number;
  topRecScore?: number;
  topRecConviction?: ConvictionLevel;
  ivRank?: number;
}

export interface WatchlistAlert {
  id: string;
  ticker: string;
  condition: string;
  isActive: boolean;
}

export interface WatchlistGroup {
  id: string;
  name: string;
  items: WatchlistItem[];
  alerts: WatchlistAlert[];
}

// ─── Catalyst ────────────────────────────────────────────────────────────────

export interface CatalystItem {
  date: string;
  label: string;
  type: 'earnings' | 'event' | 'fomc' | 'product' | 'other';
}

// ─── Market Status ────────────────────────────────────────────────────────────

export type MarketSession = 'pre' | 'open' | 'post' | 'closed';

export interface MarketStatus {
  session: MarketSession;
  spy: QuoteData;
  qqq: QuoteData;
  vix: QuoteData;
  lastSync: string;
  newRecCount: number;
  newArticleCount: number;
}

// ─── P&L Simulator ────────────────────────────────────────────────────────────

export interface PnlScenario {
  label: string;
  stockDeltaPct: number;
  dteLeft: number;
  ivChangePct: number;
  pnl: number;
  returnPct: number;
}
