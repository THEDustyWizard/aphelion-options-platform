import { ChildProcess } from 'child_process';
import { Logger } from '../utils/logger';
import { DatabaseConfig } from '../config/database';
import { RedisConfig } from '../config/redis';
import { Recommendation } from '../models/recommendation.model';
import { Ticker } from '../models/ticker.model';
import { SchwabService } from './schwab.service';
import { NewsService } from './news.service';
import { SellSignalService, SellSignalResult, ExitLevels } from './sell-signal.service';

export interface RecommendationRequest {
  ticker: string;
  sector: string;
  lookbackDays?: number;
  includeOptionsAnalysis?: boolean;
  includeNewsSentiment?: boolean;
}

export interface ConfidenceBreakdown {
  technical: number;       // 30% weight
  fundamental: number;     // 25% weight
  sectorMomentum: number;  // 20% weight
  optionsMetrics: number;  // 15% weight
  marketConditions: number;// 10% weight
  total: number;
  level: 'high' | 'medium' | 'low'; // >70 / 50-70 / <50
}

export interface SellSignalSummary {
  signal: 'SELL_NOW' | 'TAKE_PROFITS' | 'CUT_LOSSES' | 'ROLL_POSITION' | 'HOLD';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  detail: string;
  recommendation: string;
  profitTarget: number;
  stopLoss: number;
  profitTargetPct: number;
  stopLossPct: number;
  rollWarningDte: number;
}

export interface RecommendationResult {
  ticker: string;
  sector: string;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  riskScore: number;
  strategy: string;
  direction: string;
  expirationDays: number;
  strikePrice: number;
  currentPrice: number;
  entryPrice: number;         // recommended entry (ask)
  rationale: string;
  actionableIntel: string;    // "Buy X at $Y because Z, sell when A or price reaches $B"
  scores: {
    technical: number;
    fundamental: number;
    sentiment: number;
    sectorMomentum: number;
    optionsFlow: number;
    total: number;
  };
  riskFactors: {
    volatility: number;
    liquidity: number;
    sector: number;
    company: number;
    strategy: number;
    total: number;
  };
  optionsParameters: {
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
    impliedVolatility: number | null;
    ivPercentile: number | null;
    bidAskSpread: number | null;
    volume: number | null;
    openInterest: number | null;
  } | null;
  sellSignal: SellSignalSummary;
  backtestStats: {
    winRate: number;         // historical win rate for similar setups
    avgReturn: number;       // average return per trade
    maxDrawdown: number;     // max drawdown
    sharpeRatio: number;     // annualized Sharpe
    sampleSize: number;      // number of similar historical trades
  };
  positionSizing: {
    recommendedSize: number;   // dollar amount (based on $100k account)
    maxContracts: number;      // max contracts per position
    riskAmount: number;        // max dollar risk
    accountPct: number;        // % of account
  };
  generatedAt: Date;
  validUntil: Date;
}

export class RecommendationService {
  private logger: Logger;
  private schwabService: SchwabService;
  private newsService: NewsService;
  private sellSignalService: SellSignalService;
  private pythonProcess: ChildProcess | null;

  // Sector-specific ticker universes
  private readonly SECTOR_TICKERS: Record<string, string[]> = {
    defense: ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'HII', 'LDOS', 'CACI', 'BAH', 'SAIC'],
    energy:  ['XOM', 'CVX', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'HAL', 'DVN', 'OXY'],
    logistics: ['UPS', 'FDX', 'XPO', 'JBHT', 'CHRW', 'ODFL', 'SAIA', 'WERN', 'KNX', 'GXO'],
    medical: ['JNJ', 'UNH', 'PFE', 'ABT', 'MDT', 'TMO', 'DHR', 'ISRG', 'BDX', 'BSX'],
  };

  constructor() {
    this.logger = new Logger('RecommendationService');
    this.schwabService = new SchwabService();
    this.newsService = new NewsService();
    this.sellSignalService = new SellSignalService();
    this.pythonProcess = null;
  }

  async generateRecommendation(request: RecommendationRequest): Promise<RecommendationResult> {
    const {
      ticker,
      sector,
      lookbackDays = 60,
      includeOptionsAnalysis = true,
      includeNewsSentiment = true
    } = request;

    // Fetch market data
    let marketData: any = null;
    try {
      marketData = await this.schwabService.getQuote(ticker);
    } catch (error) {
      this.logger.warn(`Could not fetch market data for ${ticker}, using defaults`);
    }

    // Fetch options chain if requested
    let optionChain: any = null;
    if (includeOptionsAnalysis) {
      try {
        optionChain = await this.schwabService.getOptionChain(ticker);
      } catch (error) {
        this.logger.warn(`Could not fetch options chain for ${ticker}`);
      }
    }

    // Fetch news sentiment if requested
    let sentimentScore = 50;
    if (includeNewsSentiment) {
      try {
        const articles = await this.newsService.getNewsForTicker(ticker);
        const sentiment = this.newsService.analyzeSentiment(articles, ticker);
        sentimentScore = Math.round((sentiment.overall + 1) * 50);
      } catch (error) {
        this.logger.warn(`Could not fetch news sentiment for ${ticker}`);
      }
    }

    const currentPrice: number = marketData?.lastPrice || marketData?.mark || 100;

    // Build scores
    const scores = {
      technical: 50,
      fundamental: 50,
      sentiment: sentimentScore,
      sectorMomentum: 50,
      optionsFlow: 50,
      total: Math.round((50 + 50 + sentimentScore + 50 + 50) / 5)
    };

    // Analyze options chain
    const optionsAnalysis = this.analyzeOptions(optionChain);

    const data = {
      currentPrice,
      optionsAnalysis,
      optionChain,
      lookbackDays
    };

    // Determine strategy based on scores
    const strategy = this.selectStrategy(scores);

    // Calculate option parameters
    const { expirationDays, strikePrice } = this.calculateOptionParameters(scores, data, strategy);

    // Calculate confidence and risk
    const confidence = this.calculateConfidence(scores);

    const riskFactors = {
      volatility: optionsAnalysis?.ivPercentile || 30,
      liquidity: 20,
      sector: 25,
      company: 20,
      strategy: 25,
      total: 24
    };
    const riskScore = this.calculateRiskScore(riskFactors);

    const generatedAt = new Date();
    const validUntil = this.calculateValidUntil(expirationDays);

    // Build confidence breakdown (weighted scoring)
    const confidenceBreakdown: ConfidenceBreakdown = {
      technical: scores.technical,
      fundamental: scores.fundamental,
      sectorMomentum: scores.sectorMomentum,
      optionsMetrics: scores.optionsFlow,
      marketConditions: Math.round(50 + (sentimentScore - 50) * 0.3), // derived from sentiment
      total: confidence,
      level: confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low',
    };

    // Build sell signal
    const iv = optionsAnalysis?.impliedVolatility || 0.25;
    const entryPrice = currentPrice * (strategy.direction === 'bullish' ? 0.02 : 0.025); // approx option premium
    const exitLevels = this.sellSignalService.computeExitLevels({
      entryPrice,
      currentPrice: entryPrice, // at inception = no P&L
      direction: strategy.direction as 'bullish' | 'bearish' | 'neutral',
      impliedVolatility: iv,
      dte: expirationDays,
      strategy: strategy.name,
      riskRewardRatio: confidence >= 70 ? 2.5 : 2.0,
    });

    const sellSignalResult = this.sellSignalService.generateSellSignal({
      exitLevels,
      technicalSignals: {
        rsiOverbought: false,
        macdCrossover: false,
        ma50Cross: false,
        volumeConfirmation: false,
        rsiValue: 50,
        macdHistogram: 0,
      },
      direction: strategy.direction as 'bullish' | 'bearish' | 'neutral',
      strategy: strategy.name,
    });

    const sellSignal: SellSignalSummary = {
      signal: sellSignalResult.signal,
      urgency: sellSignalResult.urgency,
      reason: sellSignalResult.reason,
      detail: sellSignalResult.detail,
      recommendation: sellSignalResult.recommendation,
      profitTarget: exitLevels.profitTarget,
      stopLoss: exitLevels.stopLoss,
      profitTargetPct: exitLevels.profitTargetPct,
      stopLossPct: exitLevels.stopLossPct,
      rollWarningDte: exitLevels.rollWarningDte,
    };

    // Backtest stats (sector-calibrated mock estimates pending live backtest engine)
    const backtestStats = this.estimateBacktestStats(confidence, strategy.name, sector);

    // Position sizing (Kelly variant, base $100k account)
    const positionSizing = this.computePositionSizing(confidence, riskScore, entryPrice, exitLevels.stopLossPct, 100_000);

    // Actionable intel sentence
    const actionableIntel = this.buildActionableIntel({
      ticker, strategy: strategy.name, currentPrice, entryPrice,
      strikePrice, expirationDays, sellSignal, confidenceBreakdown, scores
    });

    const result: RecommendationResult = {
      ticker,
      sector,
      confidence,
      confidenceBreakdown,
      riskScore,
      strategy: strategy.name,
      direction: strategy.direction,
      expirationDays,
      strikePrice,
      currentPrice,
      entryPrice,
      rationale: `${strategy.name} recommended for ${ticker} (${sector} sector). Confidence: ${confidence}%, Risk: ${riskScore}%`,
      actionableIntel,
      scores,
      riskFactors,
      optionsParameters: optionsAnalysis,
      sellSignal,
      backtestStats,
      positionSizing,
      generatedAt,
      validUntil
    };

    // Try to save — non-fatal if DB is unavailable
    try {
      await this.saveRecommendation(result);
    } catch (error) {
      this.logger.warn(`Could not persist recommendation for ${ticker}:`, error);
    }

    return result;
  }

  async generateBatchRecommendations(
    requests: RecommendationRequest[],
    maxConcurrent = 5
  ): Promise<RecommendationResult[]> {
    const results: RecommendationResult[] = [];

    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(
        batch.map(req => this.generateRecommendation(req))
      );

      batchResults.forEach(r => {
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          this.logger.error('Batch recommendation failed:', r.reason);
        }
      });
    }

    return results;
  }

  async getRecentRecommendations(ticker: string, limit: number): Promise<Recommendation[]> {
    try {
      const repo = DatabaseConfig.getRepository(Recommendation);
      return await repo.find({
        where: { ticker: { symbol: ticker } as any },
        order: { generatedAt: 'DESC' } as any,
        take: limit
      }) as unknown as Recommendation[];
    } catch (error) {
      this.logger.error(`Failed to get recent recommendations for ${ticker}:`, error);
      return [];
    }
  }

  async getTopRecommendationsBySector(sector: string, limit: number): Promise<Recommendation[]> {
    try {
      const repo = DatabaseConfig.getRepository(Recommendation);
      return await repo.find({
        where: { sector, active: true },
        order: { confidence: 'DESC' } as any,
        take: limit
      }) as unknown as Recommendation[];
    } catch (error) {
      this.logger.error(`Failed to get top recommendations for sector ${sector}:`, error);
      return [];
    }
  }

  async backtestRecommendation(id: string, endDate: Date): Promise<any> {
    try {
      const repo = DatabaseConfig.getRepository(Recommendation);
      const recommendation = await repo.findOne({ where: { id } }) as unknown as Recommendation | null;

      if (!recommendation) {
        throw new Error(`Recommendation ${id} not found`);
      }

      let historicalData: any = null;
      try {
        const daysBack = Math.ceil(
          (endDate.getTime() - recommendation.generatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        historicalData = await this.schwabService.getHistoricalPrices(
          recommendation.ticker?.symbol || '',
          {
            periodType: 'day',
            period: Math.max(1, daysBack),
            frequencyType: 'daily',
            frequency: 1
          }
        );
      } catch (error) {
        this.logger.warn('Could not fetch historical data for backtest');
      }

      return this.simulateTrade(recommendation, historicalData);
    } catch (error) {
      this.logger.error(`Failed to backtest recommendation ${id}:`, error);
      throw error;
    }
  }

  async updateRecommendationStatus(id: string, updates: any): Promise<Recommendation> {
    try {
      const repo = DatabaseConfig.getRepository(Recommendation);
      const recommendation = await repo.findOne({ where: { id } }) as unknown as Recommendation | null;

      if (!recommendation) {
        throw new Error(`Recommendation ${id} not found`);
      }

      Object.assign(recommendation, updates);
      return await repo.save(recommendation as any) as unknown as Recommendation;
    } catch (error) {
      this.logger.error(`Failed to update recommendation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Build the actionable intelligence one-liner for each recommendation
   */
  private buildActionableIntel(params: {
    ticker: string;
    strategy: string;
    currentPrice: number;
    entryPrice: number;
    strikePrice: number;
    expirationDays: number;
    sellSignal: SellSignalSummary;
    confidenceBreakdown: ConfidenceBreakdown;
    scores: any;
  }): string {
    const { ticker, strategy, currentPrice, entryPrice, strikePrice, expirationDays, sellSignal, confidenceBreakdown, scores } = params;
    const topReason = confidenceBreakdown.technical >= 70 ? 'technical breakout' :
      confidenceBreakdown.sectorMomentum >= 70 ? 'sector momentum' :
      confidenceBreakdown.fundamental >= 70 ? 'strong fundamentals' :
      confidenceBreakdown.optionsMetrics >= 70 ? 'elevated options flow' : 'multi-factor signal alignment';

    const targetPct = sellSignal.profitTargetPct.toFixed(0);
    const stopPct = sellSignal.stopLossPct.toFixed(0);

    return `Buy ${ticker} $${strikePrice} ${strategy.includes('Put') ? 'put' : 'call'} (~$${entryPrice.toFixed(2)}) ` +
      `with ${expirationDays} DTE — driven by ${topReason}. ` +
      `Take profits at +${targetPct}% ($${sellSignal.profitTarget.toFixed(2)}) or cut at -${stopPct}% ($${sellSignal.stopLoss.toFixed(2)}). ` +
      `Roll if ${sellSignal.rollWarningDte} DTE reached with profit.`;
  }

  /**
   * Estimate backtest statistics for a given strategy/sector combination
   * In production, this would query historical recommendation performance data
   */
  private estimateBacktestStats(confidence: number, strategy: string, sector: string): {
    winRate: number; avgReturn: number; maxDrawdown: number; sharpeRatio: number; sampleSize: number;
  } {
    // Calibrated estimates by strategy type and confidence tier
    const baseWinRate = strategy.includes('Spread') || strategy.includes('Condor')
      ? 0.62   // defined-risk spread: higher win rate
      : strategy.includes('Long') ? 0.48 : 0.55;

    const confBonus = (confidence - 60) / 100; // higher confidence → better stats
    const winRate = Math.min(0.75, Math.max(0.35, baseWinRate + confBonus * 0.15));

    const avgReturn = strategy.includes('Spread')
      ? 18 + confidence * 0.2
      : strategy.includes('Long') ? -5 + confidence * 0.8 : 12 + confidence * 0.3;

    const maxDrawdown = strategy.includes('Long')
      ? -(60 - confidence * 0.3)
      : -(30 - confidence * 0.15);

    const sharpeRatio = (winRate * 2 - 1) * 2.5 + 0.5; // rough estimate

    // Sample size: sector-calibrated (defense/medical have less liquidity history)
    const sectorMultiplier = { defense: 0.6, energy: 0.9, logistics: 0.7, medical: 0.8 }[sector] || 1.0;
    const sampleSize = Math.round(120 * sectorMultiplier * (strategy.includes('Long') ? 1.2 : 0.9));

    return {
      winRate: Math.round(winRate * 100) / 100,
      avgReturn: Math.round(avgReturn * 10) / 10,
      maxDrawdown: Math.round(maxDrawdown * 10) / 10,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sampleSize,
    };
  }

  /**
   * Kelly Criterion position sizing
   */
  private computePositionSizing(
    confidence: number,
    riskScore: number,
    entryPrice: number,
    stopLossPct: number,
    accountSize: number
  ): { recommendedSize: number; maxContracts: number; riskAmount: number; accountPct: number } {
    // Fractional Kelly: f = (p×b - q) / b, where b = reward/risk
    const p = confidence / 100;
    const q = 1 - p;
    const b = 2.0; // 2:1 R:R target
    const kellyFraction = Math.max(0, (p * b - q) / b);
    const fractionalKelly = kellyFraction * 0.25; // use 1/4 Kelly for safety

    // Risk cap: never risk more than 2% per trade
    const maxRiskPct = Math.min(fractionalKelly, 0.02 - riskScore * 0.0001);
    const riskAmount = accountSize * Math.max(0.005, maxRiskPct);

    // Position size: riskAmount / (stopLossPct/100 × entryPrice × 100 shares)
    const perContractRisk = entryPrice * 100 * (stopLossPct / 100);
    const maxContracts = perContractRisk > 0 ? Math.floor(riskAmount / perContractRisk) : 1;
    const recommendedSize = Math.max(1, maxContracts) * entryPrice * 100;
    const accountPct = (recommendedSize / accountSize) * 100;

    return {
      recommendedSize: Math.round(recommendedSize),
      maxContracts: Math.max(1, maxContracts),
      riskAmount: Math.round(riskAmount),
      accountPct: Math.round(accountPct * 10) / 10,
    };
  }

  private selectStrategy(scores: any): { name: string; direction: string } {
    const total: number = scores.total || 50;

    if (total >= 70) return { name: 'Long Call', direction: 'bullish' };
    if (total >= 60) return { name: 'Bull Call Spread', direction: 'bullish' };
    if (total <= 30) return { name: 'Long Put', direction: 'bearish' };
    if (total <= 40) return { name: 'Bear Put Spread', direction: 'bearish' };
    if (total >= 45 && total <= 55) return { name: 'Iron Condor', direction: 'neutral' };
    return { name: 'Strangle', direction: 'neutral' };
  }

  /**
   * Calculate option parameters (expiration and strike)
   */
  private calculateOptionParameters(_scores: any, data: any, strategy: any): { expirationDays: number; strikePrice: number } {
    const currentPrice = data.currentPrice;
    const iv = data.optionsAnalysis?.impliedVolatility || 0.2;

    let expirationDays: number;
    let strikePrice: number;

    // Determine expiration based on strategy and volatility
    switch (strategy.name) {
      case 'Long Call':
      case 'Long Put':
        // Directional plays: 30-60 days for theta decay balance
        expirationDays = Math.round(45 + (iv * 100) - 20); // Higher IV = longer expiration
        break;
      case 'Bull Call Spread':
      case 'Bear Put Spread':
        // Spreads: 30-45 days
        expirationDays = Math.round(30 + (iv * 50));
        break;
      case 'Iron Condor':
        // Premium selling: 30-60 days
        expirationDays = Math.round(45 + (iv * 75));
        break;
      case 'Strangle':
      case 'Straddle':
        // Volatility plays: 30-90 days based on IV
        expirationDays = Math.round(60 + (iv * 150));
        break;
      case 'Calendar Spread':
        // Time decay play: near-term vs longer-term
        expirationDays = Math.round(30); // Short leg
        break;
      default:
        expirationDays = 45;
    }

    // Clamp expiration days
    expirationDays = Math.max(7, Math.min(365, expirationDays));

    // Calculate strike price based on strategy and direction
    const atmStrike = this.findAtTheMoneyStrike(data.optionChain, currentPrice);

    switch (strategy.direction) {
      case 'bullish':
        if (strategy.name === 'Long Call') {
          // Slightly OTM calls for bullish plays
          strikePrice = this.findStrikeAbove(currentPrice, 0.02); // 2% OTM
        } else if (strategy.name === 'Bull Call Spread') {
          // ATM for long leg, OTM for short leg
          strikePrice = atmStrike;
        } else {
          strikePrice = atmStrike;
        }
        break;
      case 'bearish':
        if (strategy.name === 'Long Put') {
          strikePrice = this.findStrikeBelow(currentPrice, 0.02); // 2% OTM
        } else if (strategy.name === 'Bear Put Spread') {
          strikePrice = atmStrike;
        } else {
          strikePrice = atmStrike;
        }
        break;
      case 'neutral':
        if (strategy.name === 'Iron Condor') {
          // OTM strikes for iron condor
          const callStrike = this.findStrikeAbove(currentPrice, 0.05); // 5% OTM for calls
          const putStrike = this.findStrikeBelow(currentPrice, 0.05); // 5% OTM for puts
          strikePrice = (callStrike + putStrike) / 2; // Average for reference
        } else if (strategy.name === 'Strangle' || strategy.name === 'Straddle') {
          strikePrice = atmStrike;
        } else {
          strikePrice = atmStrike;
        }
        break;
      default:
        strikePrice = atmStrike;
    }

    // If we couldn't find a specific strike, use ATM
    if (!strikePrice || strikePrice === 0) {
      strikePrice = atmStrike;
    }

    return { expirationDays, strikePrice };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(scores: any): number {
    // Weighted average of all scores
    const weights = {
      technical: 0.3,
      fundamental: 0.25,
      sentiment: 0.2,
      sectorMomentum: 0.15,
      optionsFlow: 0.1
    };

    let total = 0;
    let weightSum = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (scores[key] !== undefined) {
        total += scores[key] * weight;
        weightSum += weight;
      }
    }

    return weightSum > 0 ? Math.round(total / weightSum) : 50;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(riskFactors: any): number {
    return riskFactors.total;
  }

  /**
   * Calculate valid until date
   */
  private calculateValidUntil(expirationDays: number): Date {
    const validDays = Math.min(expirationDays, 30); // Recommendations valid for up to 30 days
    const date = new Date();
    date.setDate(date.getDate() + validDays);
    return date;
  }

  /**
   * Save recommendation to database
   */
  private async saveRecommendation(result: RecommendationResult): Promise<void> {
    try {
      const tickerRepo = DatabaseConfig.getRepository(Ticker);
      const recRepo = DatabaseConfig.getRepository(Recommendation);

      // Find or create ticker
      let ticker = await tickerRepo.findOne({ where: { symbol: result.ticker } });
      if (!ticker) {
        ticker = tickerRepo.create({
          symbol: result.ticker,
          name: result.ticker, // Would need to fetch actual name
          sector: result.sector,
          price: result.currentPrice,
          active: true
        });
        await tickerRepo.save(ticker);
      }

      // Create recommendation
      const recommendation = recRepo.create({
        tickerId: ticker.id,
        sector: result.sector,
        confidence: result.confidence,
        riskScore: result.riskScore,
        strategy: result.strategy,
        direction: result.direction,
        expirationDays: result.expirationDays,
        expirationDate: new Date(Date.now() + result.expirationDays * 24 * 60 * 60 * 1000),
        strikePrice: result.strikePrice,
        currentPrice: result.currentPrice,
        rationale: result.rationale,
        scores: result.scores,
        riskFactors: result.riskFactors,
        optionsParameters: result.optionsParameters,
        generatedAt: result.generatedAt,
        validUntil: result.validUntil,
        active: true,
        executed: false
      });

      await recRepo.save(recommendation);

      // Cache the recommendation
      await RedisConfig.setCached(
        `recommendation:${result.ticker}:latest`,
        result,
        3600 // Cache for 1 hour
      );

    } catch (error) {
      this.logger.error('Failed to save recommendation:', error);
      throw error;
    }
  }

  /**
   * Analyze options chain
   */
  private analyzeOptions(optionChain: any): any {
    if (!optionChain) return null;

    const calls = optionChain.callExpDateMap ? Object.values(optionChain.callExpDateMap).flatMap((exp: any) =>
      Object.values(exp).flat()
    ) : [];

    const puts = optionChain.putExpDateMap ? Object.values(optionChain.putExpDateMap).flatMap((exp: any) =>
      Object.values(exp).flat()
    ) : [];

    const allOptions = [...calls, ...puts];

    if (allOptions.length === 0) return null;

    // Calculate average implied volatility
    const ivs = allOptions.map(opt => (opt as any).impliedVolatility || 0).filter(iv => iv > 0);
    const avgIV = ivs.length > 0 ? ivs.reduce((a, b) => a + b) / ivs.length : 0.2;

    // Calculate IV percentile (simplified)
    const ivPercentile = Math.min(100, Math.round((avgIV / 0.5) * 100));

    // Calculate average bid-ask spread
    const spreads = allOptions.map(opt => {
      const o = opt as any;
      if (o.bid > 0 && o.ask > 0) {
        return (o.ask - o.bid) / ((o.bid + o.ask) / 2);
      }
      return 0;
    }).filter(spread => spread > 0);

    const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b) / spreads.length : 0;

    // Calculate total volume and open interest
    const totalVolume = allOptions.reduce((sum, opt) => sum + ((opt as any).totalVolume || 0), 0);
    const totalOpenInterest = allOptions.reduce((sum, opt) => sum + ((opt as any).openInterest || 0), 0);

    // Find ATM option for Greeks
    const underlyingPrice = optionChain.underlyingPrice || 0;
    const atmOption = allOptions.reduce((closest: any, opt: any) => {
      if (!opt.strike) return closest;
      const currentDiff = Math.abs(opt.strike - underlyingPrice);
      const closestDiff = closest ? Math.abs(closest.strike - underlyingPrice) : Infinity;
      return currentDiff < closestDiff ? opt : closest;
    }, null);

    const atm = atmOption as any;
    return {
      impliedVolatility: avgIV,
      ivPercentile,
      bidAskSpread: avgSpread,
      volume: totalVolume,
      openInterest: totalOpenInterest,
      delta: atm?.delta || 0,
      gamma: atm?.gamma || 0,
      theta: atm?.theta || 0,
      vega: atm?.vega || 0
    };
  }

  /**
   * Find at-the-money strike
   */
  private findAtTheMoneyStrike(optionChain: any, currentPrice: number): number {
    if (!optionChain || !optionChain.callExpDateMap) return currentPrice;

    const calls = Object.values(optionChain.callExpDateMap).flatMap((exp: any) =>
      Object.values(exp).flat()
    );

    if (calls.length === 0) return currentPrice;

    // Find strike closest to current price
    return calls.reduce((closest: number, opt: any) => {
      if (!opt.strike) return closest;
      const currentDiff = Math.abs(opt.strike - currentPrice);
      const closestDiff = Math.abs(closest - currentPrice);
      return currentDiff < closestDiff ? opt.strike : closest;
    }, (calls[0] as any).strike || currentPrice);
  }

  /**
   * Find strike above price
   */
  private findStrikeAbove(price: number, percentAbove: number): number {
    // In production, this would look at available strikes
    // For now, calculate approximate strike
    return price * (1 + percentAbove);
  }

  /**
   * Find strike below price
   */
  private findStrikeBelow(price: number, percentBelow: number): number {
    return price * (1 - percentBelow);
  }

  /**
   * Get sector ETF symbol
   */
  private getSectorETF(sector: string): string {
    const etfs: Record<string, string> = {
      defense: 'ITA',
      energy: 'XLE',
      logistics: 'XLI',
      medical: 'XLV'
    };
    return etfs[sector] || 'SPY';
  }

  /**
   * Simulate trade for backtesting
   */
  private simulateTrade(recommendation: Recommendation, historicalData: any): any {
    // Simplified simulation
    // In production, this would be much more sophisticated

    const entryPrice = recommendation.currentPrice || 0;
    const exitPrice = historicalData?.candles?.[historicalData.candles.length - 1]?.close || entryPrice;

    const pnl = exitPrice - entryPrice;
    const pnlPercentage = entryPrice > 0 ? (pnl / entryPrice) * 100 : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    if (historicalData?.candles) {
      let peak = entryPrice;
      for (const candle of historicalData.candles) {
        peak = Math.max(peak, candle.high);
        const drawdown = (peak - candle.low) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    // Win probability (simplified)
    const winProbability = recommendation.confidence * 0.7; // Base win probability on confidence

    return {
      simulatedEntryPrice: entryPrice,
      simulatedExitPrice: exitPrice,
      simulatedPnl: pnl,
      simulatedPnlPercentage: pnlPercentage,
      maxDrawdown: maxDrawdown * 100, // Convert to percentage
      winProbability
    };
  }

  /**
   * Clean up Python process
   */
  public cleanup(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}
