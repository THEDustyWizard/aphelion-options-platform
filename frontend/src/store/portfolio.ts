/**
 * APHELION PORTFOLIO STORE
 * Zustand store for portfolio management with persistence
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  StockHolding,
  OptionHolding,
  DerivativeHolding,
  Holding,
  PortfolioSummary,
  PortfolioAlert,
  TaxLot,
  PerformanceRecord,
  SectorAllocation,
  PositionRecommendation,
  RecommendationAction,
  TaxMethod,
} from '../types/portfolio';

// ─── Mock Seed Data ─────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysDiff(from: string, to: string = TODAY): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
}
void daysDiff;

const MOCK_STOCKS: StockHolding[] = [
  {
    id: 'stk-001',
    positionType: 'stock',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    shares: 50,
    avgCostBasis: 875.00,
    currentPrice: 942.50,
    purchaseDate: daysAgo(68),
    commission: 0,
    notes: 'AI semiconductor play, long-term hold',
    strategy: 'Growth',
    side: 'long',
    sector: 'Technology',
    marketValue: 50 * 942.50,
    unrealizedPnl: 50 * (942.50 - 875.00),
    unrealizedPnlPct: ((942.50 - 875.00) / 875.00) * 100,
    daysHeld: 68,
    annualizedReturn: (((942.50 - 875.00) / 875.00) / 68) * 365 * 100,
    dividendYield: 0.04,
    beta: 1.72,
  },
  {
    id: 'stk-002',
    positionType: 'stock',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    shares: 100,
    avgCostBasis: 188.30,
    currentPrice: 214.60,
    purchaseDate: daysAgo(142),
    commission: 0,
    notes: 'Core position, services growth thesis',
    strategy: 'Core Hold',
    side: 'long',
    sector: 'Technology',
    marketValue: 100 * 214.60,
    unrealizedPnl: 100 * (214.60 - 188.30),
    unrealizedPnlPct: ((214.60 - 188.30) / 188.30) * 100,
    daysHeld: 142,
    annualizedReturn: (((214.60 - 188.30) / 188.30) / 142) * 365 * 100,
    dividendYield: 0.55,
    beta: 1.21,
  },
  {
    id: 'stk-003',
    positionType: 'stock',
    ticker: 'TSLA',
    companyName: 'Tesla, Inc.',
    shares: 30,
    avgCostBasis: 251.80,
    currentPrice: 178.40,
    purchaseDate: daysAgo(34),
    commission: 0,
    notes: 'Speculative, watching for reversal',
    strategy: 'Turnaround',
    side: 'long',
    sector: 'Consumer Discretionary',
    marketValue: 30 * 178.40,
    unrealizedPnl: 30 * (178.40 - 251.80),
    unrealizedPnlPct: ((178.40 - 251.80) / 251.80) * 100,
    daysHeld: 34,
    annualizedReturn: (((178.40 - 251.80) / 251.80) / 34) * 365 * 100,
    dividendYield: 0,
    beta: 2.35,
  },
  {
    id: 'stk-004',
    positionType: 'stock',
    ticker: 'SPY',
    companyName: 'SPDR S&P 500 ETF',
    shares: 25,
    avgCostBasis: 492.10,
    currentPrice: 521.80,
    purchaseDate: daysAgo(91),
    commission: 0,
    notes: 'Core index exposure',
    strategy: 'Index Core',
    side: 'long',
    sector: 'Multi-Sector',
    marketValue: 25 * 521.80,
    unrealizedPnl: 25 * (521.80 - 492.10),
    unrealizedPnlPct: ((521.80 - 492.10) / 492.10) * 100,
    daysHeld: 91,
    annualizedReturn: (((521.80 - 492.10) / 492.10) / 91) * 365 * 100,
    dividendYield: 1.32,
    beta: 1.0,
  },
];

const MOCK_OPTIONS: OptionHolding[] = [
  {
    id: 'opt-001',
    positionType: 'option',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    contractType: 'call',
    strike: 950,
    expiration: daysFromNow(28),
    contracts: 5,
    premiumPaid: 18.40,
    currentValue: 22.60,
    purchaseDate: daysAgo(14),
    commission: 3.25,
    notes: 'Continuation play on AI momentum',
    strategy: 'Long Call',
    side: 'long',
    delta: 0.54,
    gamma: 0.008,
    theta: -0.45,
    vega: 0.32,
    iv: 0.58,
    ivRank: 72,
    marketValue: 5 * 22.60 * 100,
    unrealizedPnl: 5 * (22.60 - 18.40) * 100,
    unrealizedPnlPct: ((22.60 - 18.40) / 18.40) * 100,
    daysHeld: 14,
    dte: 28,
    breakevenPrice: 950 + 18.40,
    timeDecayDaily: 0.45 * 5 * 100,
    annualizedReturn: (((22.60 - 18.40) / 18.40) / 14) * 365 * 100,
  },
  {
    id: 'opt-002',
    positionType: 'option',
    ticker: 'SPY',
    companyName: 'SPDR S&P 500 ETF',
    contractType: 'put',
    strike: 510,
    expiration: daysFromNow(12),
    contracts: 10,
    premiumPaid: 4.20,
    currentValue: 2.85,
    purchaseDate: daysAgo(21),
    commission: 6.50,
    notes: 'Portfolio hedge, tail risk protection',
    strategy: 'Protective Put Hedge',
    side: 'long',
    delta: -0.28,
    gamma: 0.014,
    theta: -0.32,
    vega: 0.18,
    iv: 0.22,
    ivRank: 41,
    marketValue: 10 * 2.85 * 100,
    unrealizedPnl: 10 * (2.85 - 4.20) * 100,
    unrealizedPnlPct: ((2.85 - 4.20) / 4.20) * 100,
    daysHeld: 21,
    dte: 12,
    breakevenPrice: 510 - 4.20,
    timeDecayDaily: 0.32 * 10 * 100,
    annualizedReturn: (((2.85 - 4.20) / 4.20) / 21) * 365 * 100,
  },
  {
    id: 'opt-003',
    positionType: 'option',
    ticker: 'TSLA',
    companyName: 'Tesla, Inc.',
    contractType: 'put',
    strike: 180,
    expiration: daysFromNow(42),
    contracts: 3,
    premiumPaid: 8.10,
    currentValue: 12.50,
    purchaseDate: daysAgo(7),
    commission: 1.95,
    notes: 'Bearish hedge on TSLA weakness',
    strategy: 'Long Put',
    side: 'long',
    delta: -0.48,
    gamma: 0.011,
    theta: -0.28,
    vega: 0.41,
    iv: 0.74,
    ivRank: 68,
    marketValue: 3 * 12.50 * 100,
    unrealizedPnl: 3 * (12.50 - 8.10) * 100,
    unrealizedPnlPct: ((12.50 - 8.10) / 8.10) * 100,
    daysHeld: 7,
    dte: 42,
    breakevenPrice: 180 - 8.10,
    timeDecayDaily: 0.28 * 3 * 100,
    annualizedReturn: (((12.50 - 8.10) / 8.10) / 7) * 365 * 100,
  },
];

const MOCK_DERIVATIVES: DerivativeHolding[] = [
  {
    id: 'drv-001',
    positionType: 'derivative',
    ticker: 'GLD',
    companyName: 'SPDR Gold Shares',
    derivativeType: 'etf',
    quantity: 40,
    avgCostBasis: 198.50,
    currentPrice: 214.20,
    purchaseDate: daysAgo(55),
    commission: 0,
    notes: 'Inflation hedge, commodity exposure',
    strategy: 'Macro Hedge',
    side: 'long',
    marketValue: 40 * 214.20,
    unrealizedPnl: 40 * (214.20 - 198.50),
    unrealizedPnlPct: ((214.20 - 198.50) / 198.50) * 100,
    daysHeld: 55,
    annualizedReturn: (((214.20 - 198.50) / 198.50) / 55) * 365 * 100,
  },
];

// ─── Generate Recommendations ─────────────────────────────────────────────

function generateRecommendation(holding: Holding): PositionRecommendation {
  const pnlPct = holding.unrealizedPnlPct;
  let action: RecommendationAction = 'HOLD';
  let confidence = 55;
  let reasoning = '';
  let technicalScore = 60;
  let fundamentalScore = 60;
  let riskScore = 40;
  const catalysts: string[] = [];

  if (holding.positionType === 'stock') {
    const s = holding as StockHolding;
    if (pnlPct > 15) {
      technicalScore = 78;
      fundamentalScore = 72;
      if (s.ticker === 'NVDA') {
        action = 'BUY_MORE';
        confidence = 82;
        reasoning = 'Strong momentum continuing with AI data center demand. RSI at 64 — not overbought. MACD bullish crossover confirmed 3 days ago. Q4 earnings beat by 18% sets higher base. Add on any pullback to $920 support.';
        catalysts.push('GTC Developer Conference', 'Blackwell GPU ramp', 'Datacenter capex cycle');
        technicalScore = 85;
        fundamentalScore = 88;
        riskScore = 35;
      } else if (s.ticker === 'AAPL') {
        action = 'HOLD';
        confidence = 68;
        reasoning = 'Solid core holding with services revenue accelerating. RSI at 58, neutral. Stock approaching $218 resistance — wait for confirmed breakout or add near $205 support. Vision Pro cycle still early.';
        catalysts.push('Services revenue growth', 'India manufacturing expansion', 'AI integration roadmap');
        technicalScore = 70;
        fundamentalScore = 75;
        riskScore = 28;
      }
    } else if (pnlPct < -15) {
      action = 'SELL';
      confidence = 71;
      reasoning = `Position down ${pnlPct.toFixed(1)}%. RSI at 32 — approaching oversold but no reversal signal confirmed. Negative MACD divergence persists. Cut losses and reassess entry at lower support.`;
      technicalScore = 32;
      fundamentalScore = 38;
      riskScore = 72;
      catalysts.push('Review stop-loss levels', 'Monitor for reversal candle');
      if (s.ticker === 'TSLA') {
        action = 'HOLD';
        confidence = 52;
        reasoning = 'TSLA oversold on RSI (31). Cybertruck ramp and FSD v12 could act as near-term catalysts. However negative macro headwinds from interest rates. Tighten stop to $165, target $210 on reversal.';
        catalysts.push('FSD v12 release', 'Cybertruck production ramp', 'China EV competition');
        riskScore = 68;
      }
    } else {
      action = 'HOLD';
      confidence = 60;
      reasoning = `${s.ticker} in neutral territory. RSI 50-58 range suggests consolidation. Wait for volume confirmation before adding. Support at $${(s.currentPrice * 0.95).toFixed(0)}.`;
      catalysts.push('Monitor technical levels', 'Earnings calendar check');
    }
  } else if (holding.positionType === 'option') {
    const o = holding as OptionHolding;
    const urgency = o.dte < 14 ? 'URGENT: ' : '';
    if (o.dte < 7) {
      action = 'SELL';
      confidence = 88;
      reasoning = `${urgency}Only ${o.dte} DTE remaining. Theta burn accelerating. Lock in remaining value. Time decay destroying ~$${o.timeDecayDaily.toFixed(0)}/day.`;
      riskScore = 85;
      technicalScore = 40;
      catalysts.push(`${o.dte} days to expiration`, 'Max theta decay zone');
    } else if (o.dte < 21 && pnlPct < -30) {
      action = 'ROLL';
      confidence = 76;
      reasoning = `${urgency}Position down ${pnlPct.toFixed(0)}% with ${o.dte} DTE. Roll out 30-45 days to reduce theta risk and give position time to recover. Consider rolling to ${o.contractType === 'call' ? 'higher' : 'lower'} strike if directional thesis still valid.`;
      riskScore = 65;
      catalysts.push('Avoid expiration loss', 'Extend time for thesis to play out');
    } else if (pnlPct > 50) {
      action = 'SELL';
      confidence = 79;
      reasoning = `Excellent gain of ${pnlPct.toFixed(0)}%. Take profits at 50%+ return. IV rank of ${o.ivRank ?? 'N/A'} suggests premium has been realized. Close position and redeploy capital.`;
      technicalScore = 85;
      riskScore = 45;
      catalysts.push('50%+ profit target reached', 'Redeploy capital');
    } else if (o.dte > 30 && pnlPct > 20) {
      action = 'HOLD';
      confidence = 72;
      reasoning = `Good unrealized gain with ${o.dte} DTE remaining. Maintain position. Consider trailing stop at ${(pnlPct * 0.6).toFixed(0)}% of peak profit. Delta of ${o.delta?.toFixed(2)} offers continued upside.`;
      technicalScore = 75;
      catalysts.push('Continued directional momentum', `${o.dte} days runway`);
    } else {
      action = 'HOLD';
      confidence = 58;
      reasoning = `Monitor position. ${o.dte} DTE. Theta decay ~$${o.timeDecayDaily?.toFixed(0)}/day total. Set alert at 21 DTE for rolling decision.`;
      catalysts.push('Monitor theta decay', 'Evaluate at 21 DTE');
    }
  } else {
    // Derivative
    action = pnlPct > 5 ? 'HOLD' : pnlPct < -10 ? 'SELL' : 'HOLD';
    confidence = 62;
    reasoning = `ETF/derivative position ${pnlPct > 0 ? 'performing well' : 'underperforming'}. Review macro thesis alignment quarterly.`;
    catalysts.push('Quarterly macro review');
  }

  return {
    holdingId: holding.id,
    action,
    confidence,
    reasoning,
    technicalScore,
    fundamentalScore,
    riskScore,
    catalysts,
    targetPrice: holding.positionType === 'stock'
      ? parseFloat(((holding as StockHolding).currentPrice * 1.12).toFixed(2))
      : undefined,
    stopLoss: holding.positionType === 'stock'
      ? parseFloat(((holding as StockHolding).currentPrice * 0.92).toFixed(2))
      : undefined,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Mock Portfolio Summary ────────────────────────────────────────────────

function calcSummary(
  stocks: StockHolding[],
  options: OptionHolding[],
  derivatives: DerivativeHolding[]
): PortfolioSummary {
  const allHoldings = [...stocks, ...options, ...derivatives];
  const totalValue = allHoldings.reduce((s, h) => s + h.marketValue, 0);
  const totalCostBasis = [
    ...stocks.map((h) => h.shares * h.avgCostBasis + h.commission),
    ...options.map((h) => h.contracts * h.premiumPaid * 100 + h.commission),
    ...derivatives.map((h) => h.quantity * h.avgCostBasis + h.commission),
  ].reduce((a, b) => a + b, 0);

  const totalUnrealizedPnl = allHoldings.reduce((s, h) => s + h.unrealizedPnl, 0);
  const stockVal = stocks.reduce((s, h) => s + h.marketValue, 0);
  const optVal = options.reduce((s, h) => s + h.marketValue, 0);
  const drvVal = derivatives.reduce((s, h) => s + h.marketValue, 0);

  const totalDelta = options.reduce((s, h) => s + (h.delta ?? 0) * h.contracts * 100, 0);
  const totalTheta = options.reduce((s, h) => s + (h.theta ?? 0) * h.contracts * 100, 0);
  const totalVega = options.reduce((s, h) => s + (h.vega ?? 0) * h.contracts * 100, 0);

  const winning = allHoldings.filter((h) => h.unrealizedPnl > 0).length;
  const losing = allHoldings.filter((h) => h.unrealizedPnl < 0).length;

  return {
    totalValue,
    totalCostBasis,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct: (totalUnrealizedPnl / totalCostBasis) * 100,
    dailyPnl: totalValue * 0.0082,    // mock daily
    dailyPnlPct: 0.82,
    betaWeightedDelta: stocks.reduce((s, h) => s + (h.beta ?? 1) * h.marketValue, 0) / totalValue,
    valueAtRisk95: totalValue * 0.0235,
    maxDrawdown: -12.4,
    sharpeRatio: 1.84,
    sortinoRatio: 2.31,
    stockAllocationPct: (stockVal / totalValue) * 100,
    optionAllocationPct: (optVal / totalValue) * 100,
    derivativeAllocationPct: (drvVal / totalValue) * 100,
    cashAllocationPct: 5.2,
    totalDelta,
    totalTheta,
    totalVega,
    totalPositions: allHoldings.length,
    winningPositions: winning,
    losingPositions: losing,
  };
}

const MOCK_ALERTS: PortfolioAlert[] = [
  {
    id: 'alrt-001',
    holdingId: 'opt-002',
    ticker: 'SPY',
    type: 'expiration',
    condition: 'Option expires in 12 days',
    targetValue: 12,
    isActive: true,
    isTriggered: false,
    daysUntilEvent: 12,
  },
  {
    id: 'alrt-002',
    holdingId: 'stk-003',
    ticker: 'TSLA',
    type: 'price_target',
    condition: 'Stop loss at $165.00',
    targetValue: 165.00,
    isActive: true,
    isTriggered: false,
  },
  {
    id: 'alrt-003',
    holdingId: 'stk-001',
    ticker: 'NVDA',
    type: 'earnings',
    condition: 'NVDA Earnings in ~14 days',
    targetValue: 14,
    isActive: true,
    isTriggered: false,
    daysUntilEvent: 14,
  },
];

const MOCK_PERFORMANCE: PerformanceRecord[] = [
  { period: '2025-01', periodType: 'monthly', portfolioReturn: 0.0412, benchmarkReturn: 0.0318, alpha: 0.0094, totalPnl: 2890, winCount: 5, lossCount: 2, bestPosition: 'NVDA', worstPosition: 'TSLA' },
  { period: '2025-02', periodType: 'monthly', portfolioReturn: 0.0218, benchmarkReturn: 0.0154, alpha: 0.0064, totalPnl: 1580, winCount: 4, lossCount: 3, bestPosition: 'AAPL', worstPosition: 'SPY PUT' },
  { period: '2025-03', periodType: 'monthly', portfolioReturn: 0.0561, benchmarkReturn: 0.0290, alpha: 0.0271, totalPnl: 4120, winCount: 6, lossCount: 1, bestPosition: 'NVDA CALL', worstPosition: 'TSLA' },
];

const MOCK_TAX_LOTS: TaxLot[] = [
  { id: 'tx-001', holdingId: 'stk-001', ticker: 'NVDA', positionType: 'stock', quantity: 50, costBasis: 875.00, purchaseDate: daysAgo(68), isShortTerm: true, taxMethod: 'FIFO' },
  { id: 'tx-002', holdingId: 'stk-002', ticker: 'AAPL', positionType: 'stock', quantity: 100, costBasis: 188.30, purchaseDate: daysAgo(142), isShortTerm: false, taxMethod: 'FIFO' },
  { id: 'tx-003', holdingId: 'stk-003', ticker: 'TSLA', positionType: 'stock', quantity: 30, costBasis: 251.80, purchaseDate: daysAgo(34), isShortTerm: true, taxMethod: 'FIFO' },
  {
    id: 'tx-004', holdingId: 'stk-999', ticker: 'META', positionType: 'stock',
    quantity: 20, costBasis: 320.40, purchaseDate: daysAgo(180),
    saleDate: daysAgo(10), salePrice: 485.20,
    realizedGain: 20 * (485.20 - 320.40),
    isShortTerm: false, taxMethod: 'FIFO',
  },
];

const MOCK_SECTOR_ALLOCATION: SectorAllocation[] = [
  { sector: 'Technology', value: 0, pct: 52.4, change: 2.1 },
  { sector: 'Consumer Discretionary', value: 0, pct: 12.8, change: -4.2 },
  { sector: 'Multi-Sector', value: 0, pct: 18.6, change: 0.8 },
  { sector: 'Commodities', value: 0, pct: 11.2, change: 1.4 },
  { sector: 'Cash', value: 0, pct: 5.0, change: 0 },
];

// ─── Store Interface ─────────────────────────────────────────────────────

type PortfolioTab = 'holdings' | 'analysis' | 'risk' | 'performance' | 'tax';
type HoldingsTab = 'stocks' | 'options' | 'derivatives';

interface PortfolioStore {
  // State
  stocks: StockHolding[];
  options: OptionHolding[];
  derivatives: DerivativeHolding[];
  alerts: PortfolioAlert[];
  taxLots: TaxLot[];
  performance: PerformanceRecord[];
  sectorAllocation: SectorAllocation[];
  recommendations: Record<string, PositionRecommendation>;
  taxMethod: TaxMethod;
  activeTab: PortfolioTab;
  activeHoldingsTab: HoldingsTab;
  showAddForm: boolean;
  selectedHoldingId: string | null;

  // Computed (derived but cached)
  summary: PortfolioSummary;

  // Actions
  setActiveTab: (tab: PortfolioTab) => void;
  setActiveHoldingsTab: (tab: HoldingsTab) => void;
  setShowAddForm: (show: boolean) => void;
  setSelectedHolding: (id: string | null) => void;
  setTaxMethod: (method: TaxMethod) => void;
  addStock: (holding: StockHolding) => void;
  addOption: (holding: OptionHolding) => void;
  addDerivative: (holding: DerivativeHolding) => void;
  removeHolding: (id: string) => void;
  refreshRecommendations: () => void;
  updateSummary: () => void;
  toggleAlert: (id: string) => void;
  getHolding: (id: string) => Holding | undefined;
}

const initialStocks = MOCK_STOCKS;
const initialOptions = MOCK_OPTIONS;
const initialDerivatives = MOCK_DERIVATIVES;
const initialRecs: Record<string, PositionRecommendation> = {};
[...initialStocks, ...initialOptions, ...initialDerivatives].forEach((h) => {
  initialRecs[h.id] = generateRecommendation(h);
});

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      stocks: initialStocks,
      options: initialOptions,
      derivatives: initialDerivatives,
      alerts: MOCK_ALERTS,
      taxLots: MOCK_TAX_LOTS,
      performance: MOCK_PERFORMANCE,
      sectorAllocation: MOCK_SECTOR_ALLOCATION,
      recommendations: initialRecs,
      taxMethod: 'FIFO',
      activeTab: 'holdings',
      activeHoldingsTab: 'stocks',
      showAddForm: false,
      selectedHoldingId: null,
      summary: calcSummary(initialStocks, initialOptions, initialDerivatives),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveHoldingsTab: (tab) => set({ activeHoldingsTab: tab }),
      setShowAddForm: (show) => set({ showAddForm: show }),
      setSelectedHolding: (id) => set({ selectedHoldingId: id }),
      setTaxMethod: (method) => set({ taxMethod: method }),
      toggleAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, isActive: !a.isActive } : a
          ),
        })),

      addStock: (holding) =>
        set((s) => {
          const stocks = [...s.stocks, holding];
          const recs = { ...s.recommendations, [holding.id]: generateRecommendation(holding) };
          return { stocks, recommendations: recs, summary: calcSummary(stocks, s.options, s.derivatives) };
        }),

      addOption: (holding) =>
        set((s) => {
          const options = [...s.options, holding];
          const recs = { ...s.recommendations, [holding.id]: generateRecommendation(holding) };
          return { options, recommendations: recs, summary: calcSummary(s.stocks, options, s.derivatives) };
        }),

      addDerivative: (holding) =>
        set((s) => {
          const derivatives = [...s.derivatives, holding];
          const recs = { ...s.recommendations, [holding.id]: generateRecommendation(holding) };
          return { derivatives, recommendations: recs, summary: calcSummary(s.stocks, s.options, derivatives) };
        }),

      removeHolding: (id) =>
        set((s) => {
          const stocks = s.stocks.filter((h) => h.id !== id);
          const options = s.options.filter((h) => h.id !== id);
          const derivatives = s.derivatives.filter((h) => h.id !== id);
          const recs = { ...s.recommendations };
          delete recs[id];
          return { stocks, options, derivatives, recommendations: recs, summary: calcSummary(stocks, options, derivatives) };
        }),

      refreshRecommendations: () =>
        set((s) => {
          const recs: Record<string, PositionRecommendation> = {};
          [...s.stocks, ...s.options, ...s.derivatives].forEach((h) => {
            recs[h.id] = generateRecommendation(h);
          });
          return { recommendations: recs };
        }),

      updateSummary: () =>
        set((s) => ({
          summary: calcSummary(s.stocks, s.options, s.derivatives),
        })),

      getHolding: (id) => {
        const s = get();
        return (
          s.stocks.find((h) => h.id === id) ||
          s.options.find((h) => h.id === id) ||
          s.derivatives.find((h) => h.id === id)
        );
      },
    }),
    {
      name: 'aphelion-portfolio',
      partialize: (s) => ({
        stocks: s.stocks,
        options: s.options,
        derivatives: s.derivatives,
        alerts: s.alerts,
        taxLots: s.taxLots,
        taxMethod: s.taxMethod,
      }),
    }
  )
);
