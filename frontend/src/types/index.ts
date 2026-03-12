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
  calculationDetails?: CalculationDetails;
  /** Automated sell signal data */
  sellSignal?: SellSignal;
  /** Confidence scoring breakdown */
  confidenceBreakdown?: ConfidenceBreakdown;
  /** Backtest performance statistics */
  backtestStats?: BacktestStats;
  /** Live data from Schwab API when connected */
  liveData?: {
    bid: number;
    ask: number;
    last: number;
    iv?: number;
    delta?: number;
    theta?: number;
    gamma?: number;
    vega?: number;
    lastUpdated: string;
  };
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

// ─── Calculation Transparency ─────────────────────────────────────────────────

export interface TradeSignals {
  /** Recommended entry price (ask or mid) */
  buyAt: number;
  /** Profit target price */
  sellTarget: number;
  /** Stop loss price */
  stopLoss: number;
  /** Breakeven price at expiry */
  breakeven: number;
  /** Expiration date MM/DD/YYYY */
  expiration: string;
  /** Days to expiration */
  dte: number;
  /** Profit target as % of premium */
  profitTargetPct: number;
  /** Stop loss as % of premium */
  stopLossPct: number;
}

// ─── Sell Signals ─────────────────────────────────────────────────────────────

export type SellSignalType = 'SELL_NOW' | 'TAKE_PROFITS' | 'CUT_LOSSES' | 'ROLL_POSITION' | 'HOLD';
export type SellSignalUrgency = 'critical' | 'high' | 'medium' | 'low';

export interface SellTrigger {
  type: 'profit_target' | 'stop_loss' | 'time_decay' | 'technical' | 'fundamental';
  label: string;
  triggered: boolean;
  value: number;
  threshold: number;
  description: string;
}

export interface SellSignal {
  signal: SellSignalType;
  urgency: SellSignalUrgency;
  reason: string;
  detail: string;
  recommendation: string;
  profitTarget: number;
  stopLoss: number;
  profitTargetPct: number;
  stopLossPct: number;
  rollWarningDte: number;
  triggers?: SellTrigger[];
  currentPnlPct?: number;
}

// ─── Confidence Scoring ───────────────────────────────────────────────────────

export interface ConfidenceBreakdown {
  technical: number;        // 30% weight — RSI, MACD, MAs
  fundamental: number;      // 25% weight — P/E, P/B, dividend
  sectorMomentum: number;   // 20% weight — sector-specific scoring
  optionsMetrics: number;   // 15% weight — IV rank, skew, volume
  marketConditions: number; // 10% weight — VIX, macro
  total: number;            // 0-100
  level: 'high' | 'medium' | 'low';
}

// ─── Portfolio Positions ──────────────────────────────────────────────────────

export interface PortfolioPosition {
  id: string;
  recId: string;
  ticker: string;
  strategy: string;
  strike: number;
  expiry: string;
  optionType: 'call' | 'put';
  entryPrice: number;
  currentPrice: number;
  contracts: number;
  entryDate: string;
  costBasis: number;        // entryPrice × contracts × 100
  currentValue: number;     // currentPrice × contracts × 100
  pnl: number;              // currentValue - costBasis
  pnlPct: number;           // pnl / costBasis × 100
  sellSignal: SellSignal;
  sector: 'defense' | 'energy' | 'logistics' | 'medical' | string;
  confidenceAtEntry: number;
  delta?: number;
  theta?: number;
  iv?: number;
  status: 'open' | 'closed' | 'expired';
}

export interface PortfolioRiskMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPct: number;
  portfolioBeta: number;
  sectorConcentration: Record<string, number>;  // sector → % allocation
  openPositions: number;
  alertCount: number;        // positions with SELL_NOW or CUT_LOSSES
  avgDte: number;
  maxPositionSize: number;   // largest single position %
}

// ─── Backtest Stats ───────────────────────────────────────────────────────────

export interface BacktestStats {
  winRate: number;           // 0-1 decimal
  avgReturn: number;         // percentage
  maxDrawdown: number;       // negative percentage
  sharpeRatio: number;
  sampleSize: number;        // number of historical trades analyzed
  strategyLabel: string;
  timeframe: string;         // e.g. "90-day lookback"
}

export interface CalculationDetails {
  /** Pricing model used */
  model: 'Black-Scholes' | 'Binomial' | 'Monte Carlo';

  /** Model inputs */
  inputs: {
    underlyingPrice: number;
    strikePrice: number;
    impliedVol: number;          // decimal e.g. 0.26
    historicalVol?: number;      // 30-day HV, decimal
    timeToExpiryYears: number;
    riskFreeRate: number;        // decimal e.g. 0.053
    premium: number;             // what we pay
  };

  /** Intermediate values */
  intermediate: {
    d1: number;
    d2: number;
    nd1: number;
    nd2: number;
    theoreticalPrice: number;
    ivVsHvSpread?: number;       // IV - HV in decimal
    ivVsHvLabel?: string;        // e.g. "IV is 12% above 30-day HV"
  };

  /** Greeks */
  greeks: {
    delta: number;
    gamma: number;
    theta: number;   // $/day
    vega: number;    // $ per 1% IV move
    rho: number;     // $ per 1% rate move
  };

  /** Output metrics */
  output: {
    breakevenPrice: number;
    breakevenFormula: string;    // e.g. "Strike + Premium = 195 + 2.45 = 197.45"
    probabilityOfProfit: number; // 0-100
    expectedReturn: number;      // dollar
    maxLoss: number;
    maxProfit: number | null;
    riskRewardRatio: string;     // e.g. "1:4.2"
  };

  /** Why this strike was selected */
  strikeSelectionReason: string;

  /** Actionable trade signals */
  tradeSignals: TradeSignals;
}

// ─── Schwab API ───────────────────────────────────────────────────────────────

export interface SchwabCredentials {
  appKey: string;       // obfuscated in storage
  appSecret: string;    // obfuscated in storage
  callbackUrl: string;
}

export interface SchwabConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  message: string;
  accountId?: string;
  lastConnected?: string | null;
}
