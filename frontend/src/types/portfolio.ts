// ─── APHELION PORTFOLIO MANAGEMENT TYPES ────────────────────────────────────

export type PositionType = 'stock' | 'option' | 'derivative';
export type OptionContractType = 'call' | 'put';
export type DerivativeType = 'future' | 'warrant' | 'etf' | 'other';
export type TaxMethod = 'FIFO' | 'LIFO' | 'HIFO';
export type PositionSide = 'long' | 'short';
export type RecommendationAction = 'BUY_MORE' | 'HOLD' | 'SELL' | 'ROLL' | 'COVER';

// ─── Stock Holding ─────────────────────────────────────────────────────────
export interface StockHolding {
  id: string;
  positionType: 'stock';
  ticker: string;
  companyName: string;
  shares: number;
  avgCostBasis: number;       // per share
  currentPrice: number;
  purchaseDate: string;       // ISO
  commission: number;
  notes?: string;
  strategy?: string;
  side: PositionSide;
  sector?: string;
  // Computed
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  daysHeld: number;
  annualizedReturn: number;
  dividendYield?: number;
  beta?: number;
}

// ─── Option Holding ────────────────────────────────────────────────────────
export interface OptionHolding {
  id: string;
  positionType: 'option';
  ticker: string;
  companyName: string;
  contractType: OptionContractType;
  strike: number;
  expiration: string;         // ISO
  contracts: number;          // number of contracts (1 contract = 100 shares)
  premiumPaid: number;        // per contract (not per share)
  currentValue: number;       // current per-contract value
  purchaseDate: string;       // ISO
  commission: number;
  notes?: string;
  strategy?: string;
  side: PositionSide;
  // Greeks
  delta?: number;
  gamma?: number;
  theta?: number;             // $ per day decay
  vega?: number;
  iv?: number;                // implied vol decimal
  ivRank?: number;            // 0-100
  // Computed
  marketValue: number;        // contracts * currentValue * 100
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  daysHeld: number;
  dte: number;                // days to expiration
  breakevenPrice: number;
  timeDecayDaily: number;     // theta * contracts * 100
  annualizedReturn: number;
}

// ─── Derivative Holding ────────────────────────────────────────────────────
export interface DerivativeHolding {
  id: string;
  positionType: 'derivative';
  ticker: string;
  companyName: string;
  derivativeType: DerivativeType;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  purchaseDate: string;
  commission: number;
  notes?: string;
  strategy?: string;
  side: PositionSide;
  expiration?: string;
  // Computed
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  daysHeld: number;
  annualizedReturn: number;
}

export type Holding = StockHolding | OptionHolding | DerivativeHolding;

// ─── Position Recommendation ───────────────────────────────────────────────
export interface PositionRecommendation {
  holdingId: string;
  action: RecommendationAction;
  confidence: number;         // 0-100
  reasoning: string;
  technicalScore: number;     // 0-100
  fundamentalScore: number;   // 0-100
  riskScore: number;          // 0-100 (higher = more risky)
  catalysts: string[];
  targetPrice?: number;
  stopLoss?: number;
  // Options-specific
  rollToStrike?: number;
  rollToExpiry?: string;
  rollReason?: string;
  // Generated at
  generatedAt: string;
}

// ─── Portfolio Summary ─────────────────────────────────────────────────────
export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  dailyPnl: number;
  dailyPnlPct: number;
  // Risk metrics
  betaWeightedDelta: number;
  valueAtRisk95: number;      // 1-day 95% VaR
  maxDrawdown: number;        // historical max drawdown
  sharpeRatio: number;
  sortinoRatio: number;
  // Allocation
  stockAllocationPct: number;
  optionAllocationPct: number;
  derivativeAllocationPct: number;
  cashAllocationPct: number;
  // Greeks exposure (options portfolio)
  totalDelta: number;
  totalTheta: number;         // daily decay
  totalVega: number;
  // Counts
  totalPositions: number;
  winningPositions: number;
  losingPositions: number;
}

// ─── Sector Allocation ────────────────────────────────────────────────────
export interface SectorAllocation {
  sector: string;
  value: number;
  pct: number;
  change: number;
}

// ─── Performance Record ────────────────────────────────────────────────────
export interface PerformanceRecord {
  period: string;             // e.g. '2025-01', '2025-Q1', '2025'
  periodType: 'monthly' | 'quarterly' | 'annual';
  portfolioReturn: number;    // decimal
  benchmarkReturn: number;    // SPY return
  alpha: number;
  totalPnl: number;
  winCount: number;
  lossCount: number;
  bestPosition: string;
  worstPosition: string;
}

// ─── Tax Lot ───────────────────────────────────────────────────────────────
export interface TaxLot {
  id: string;
  holdingId: string;
  ticker: string;
  positionType: PositionType;
  quantity: number;
  costBasis: number;
  purchaseDate: string;
  saleDate?: string;
  salePrice?: number;
  realizedGain?: number;
  isShortTerm: boolean;       // < 1 year
  isWashSale?: boolean;
  washSaleDisallowed?: number;
  taxMethod: TaxMethod;
}

// ─── Alert ────────────────────────────────────────────────────────────────
export interface PortfolioAlert {
  id: string;
  holdingId: string;
  ticker: string;
  type: 'price_target' | 'stop_loss' | 'earnings' | 'expiration' | 'dividend' | 'corporate_action';
  condition: string;          // human readable
  targetValue: number;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  daysUntilEvent?: number;
}

// ─── Add Position Form ────────────────────────────────────────────────────
export interface AddStockForm {
  positionType: 'stock';
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  commission: number;
  notes: string;
  strategy: string;
  side: PositionSide;
}

export interface AddOptionForm {
  positionType: 'option';
  ticker: string;
  contractType: OptionContractType;
  strike: number;
  expiration: string;
  contracts: number;
  premiumPaid: number;
  purchaseDate: string;
  commission: number;
  notes: string;
  strategy: string;
  side: PositionSide;
}

export interface AddDerivativeForm {
  positionType: 'derivative';
  ticker: string;
  derivativeType: DerivativeType;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  commission: number;
  notes: string;
  strategy: string;
  side: PositionSide;
  expiration: string;
}

export type AddPositionForm = AddStockForm | AddOptionForm | AddDerivativeForm;

// ─── Optimization ────────────────────────────────────────────────────────
export interface RebalanceSuggestion {
  action: 'increase' | 'decrease' | 'neutral';
  ticker: string;
  currentPct: number;
  targetPct: number;
  reason: string;
  estimatedTrade: number;     // $ amount
}

export interface PositionSizingSuggestion {
  ticker: string;
  recommendedSize: number;    // $ amount
  recommendedShares?: number;
  riskAmount: number;         // $ at risk (1-2% portfolio)
  rationale: string;
}
