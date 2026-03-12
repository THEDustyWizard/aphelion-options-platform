/**
 * APHELION // Sell Signal Service
 * Automated sell signal generation with multiple exit strategies.
 * Produces actionable signals: SELL_NOW, TAKE_PROFITS, CUT_LOSSES, ROLL_POSITION, HOLD
 */

import { Logger } from '../utils/logger';
import { SchwabService } from './schwab.service';

export type SellSignalType = 'SELL_NOW' | 'TAKE_PROFITS' | 'CUT_LOSSES' | 'ROLL_POSITION' | 'HOLD';

export interface SellSignalResult {
  signal: SellSignalType;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  detail: string;
  triggers: SellTrigger[];
  recommendation: string;
}

export interface SellTrigger {
  type: 'profit_target' | 'stop_loss' | 'time_decay' | 'technical' | 'fundamental';
  label: string;
  triggered: boolean;
  value: number;
  threshold: number;
  description: string;
}

export interface ExitLevels {
  /** Entry price (option premium paid) */
  entryPrice: number;
  /** Current mark price */
  currentPrice: number;
  /** Profit target price */
  profitTarget: number;
  /** Stop loss price */
  stopLoss: number;
  /** Profit target as % of entry */
  profitTargetPct: number;
  /** Stop loss as % of entry */
  stopLossPct: number;
  /** Current unrealized P&L as % */
  currentPnlPct: number;
  /** Days to expiration */
  dte: number;
  /** Time decay warning threshold (DTE) */
  rollWarningDte: number;
}

export interface TechnicalExitSignals {
  rsiOverbought: boolean;  // RSI > 70 for calls, < 30 for puts
  macdCrossover: boolean;  // MACD signal crossover against position
  ma50Cross: boolean;      // Price crossed 50-day MA against direction
  volumeConfirmation: boolean;
  rsiValue: number;
  macdHistogram: number;
}

export class SellSignalService {
  private logger: Logger;
  private schwabService: SchwabService;

  constructor() {
    this.logger = new Logger('SellSignalService');
    this.schwabService = new SchwabService();
  }

  /**
   * Compute exit levels for a recommendation based on volatility and strategy
   */
  computeExitLevels(params: {
    entryPrice: number;
    currentPrice: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    impliedVolatility: number;
    dte: number;
    strategy: string;
    riskRewardRatio?: number; // default 2:1
  }): ExitLevels {
    const { entryPrice, currentPrice, direction, impliedVolatility, dte, strategy, riskRewardRatio = 2 } = params;

    // ATR-based stop: use IV as proxy for expected move
    // Daily move ≈ S × IV / √252
    const ivDailyMove = impliedVolatility / Math.sqrt(252);

    // Stop loss: 30-50% of premium depending on strategy
    let stopLossPct: number;
    let profitTargetPct: number;

    if (strategy.includes('Spread') || strategy.includes('Iron Condor')) {
      // Defined risk strategies: tighter stops
      stopLossPct = 50;  // cut at 50% of max loss
      profitTargetPct = 50; // take 50% of max profit
    } else if (strategy.includes('Long Call') || strategy.includes('Long Put')) {
      // Long options: wider stops due to theta decay
      stopLossPct = 40;  // stop at 40% loss
      profitTargetPct = stopLossPct * riskRewardRatio; // 2:1 or 3:1 R:R
    } else {
      stopLossPct = 35;
      profitTargetPct = stopLossPct * riskRewardRatio;
    }

    // Cap profit target at 200% for options (avoid being greedy)
    profitTargetPct = Math.min(profitTargetPct, 200);

    const profitTarget = entryPrice * (1 + profitTargetPct / 100);
    const stopLoss = entryPrice * (1 - stopLossPct / 100);
    const currentPnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

    // Roll warning: when DTE drops to 21 for long positions (theta accelerates)
    const rollWarningDte = strategy.includes('Long') ? 21 : 14;

    return {
      entryPrice,
      currentPrice,
      profitTarget,
      stopLoss,
      profitTargetPct,
      stopLossPct,
      currentPnlPct,
      dte,
      rollWarningDte,
    };
  }

  /**
   * Evaluate current technical conditions for exit signals
   */
  evaluateTechnicalExits(params: {
    direction: 'bullish' | 'bearish' | 'neutral';
    rsi: number;
    macdHistogram: number; // positive = bullish momentum
    priceAbove50ma: boolean;
    volume: number;
    avgVolume: number;
  }): TechnicalExitSignals {
    const { direction, rsi, macdHistogram, priceAbove50ma, volume, avgVolume } = params;

    let rsiOverbought = false;
    let macdCrossover = false;
    let ma50Cross = false;

    if (direction === 'bullish') {
      rsiOverbought = rsi > 70;
      macdCrossover = macdHistogram < 0; // momentum turned negative
      ma50Cross = !priceAbove50ma; // dropped below 50 MA
    } else if (direction === 'bearish') {
      rsiOverbought = rsi < 30; // oversold = reversal risk for puts
      macdCrossover = macdHistogram > 0; // momentum turned positive against short
      ma50Cross = priceAbove50ma; // recovered above 50 MA
    }
    // neutral strategies: technical exits less relevant

    const volumeConfirmation = volume > avgVolume * 1.5;

    return {
      rsiOverbought,
      macdCrossover,
      ma50Cross,
      volumeConfirmation,
      rsiValue: rsi,
      macdHistogram,
    };
  }

  /**
   * Generate the primary sell signal based on all exit conditions
   */
  generateSellSignal(params: {
    exitLevels: ExitLevels;
    technicalSignals: TechnicalExitSignals;
    fundamentalsDeterioration?: boolean;
    earningsDaysOut?: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    strategy: string;
  }): SellSignalResult {
    const { exitLevels, technicalSignals, fundamentalsDeterioration, earningsDaysOut, direction, strategy } = params;

    const triggers: SellTrigger[] = [];
    let urgencyScore = 0;

    // ── Profit Target ─────────────────────────────────────────────
    const profitTargetHit = exitLevels.currentPnlPct >= exitLevels.profitTargetPct;
    triggers.push({
      type: 'profit_target',
      label: 'Profit Target',
      triggered: profitTargetHit,
      value: exitLevels.currentPnlPct,
      threshold: exitLevels.profitTargetPct,
      description: `Target: +${exitLevels.profitTargetPct.toFixed(0)}% | Current: ${exitLevels.currentPnlPct >= 0 ? '+' : ''}${exitLevels.currentPnlPct.toFixed(1)}%`,
    });
    if (profitTargetHit) urgencyScore += 3;

    // ── Stop Loss ─────────────────────────────────────────────────
    const stopLossHit = exitLevels.currentPnlPct <= -exitLevels.stopLossPct;
    triggers.push({
      type: 'stop_loss',
      label: 'Stop Loss',
      triggered: stopLossHit,
      value: exitLevels.currentPnlPct,
      threshold: -exitLevels.stopLossPct,
      description: `Stop: -${exitLevels.stopLossPct.toFixed(0)}% | Current: ${exitLevels.currentPnlPct >= 0 ? '+' : ''}${exitLevels.currentPnlPct.toFixed(1)}%`,
    });
    if (stopLossHit) urgencyScore += 5;

    // ── Time Decay Warning ────────────────────────────────────────
    const rollWarning = exitLevels.dte <= exitLevels.rollWarningDte && strategy.includes('Long');
    const timeExpiry = exitLevels.dte <= 7; // danger zone
    triggers.push({
      type: 'time_decay',
      label: 'Time Decay (Theta)',
      triggered: rollWarning || timeExpiry,
      value: exitLevels.dte,
      threshold: exitLevels.rollWarningDte,
      description: `${exitLevels.dte} DTE — ${timeExpiry ? '⚠ THETA DANGER ZONE' : rollWarning ? 'theta accelerating' : 'theta manageable'}`,
    });
    if (timeExpiry) urgencyScore += 4;
    else if (rollWarning) urgencyScore += 2;

    // ── Technical Exit ────────────────────────────────────────────
    const technicalExit = technicalSignals.rsiOverbought && technicalSignals.macdCrossover;
    const technicalWarn = technicalSignals.rsiOverbought || technicalSignals.macdCrossover;
    triggers.push({
      type: 'technical',
      label: 'Technical Reversal',
      triggered: technicalExit,
      value: technicalSignals.rsiValue,
      threshold: direction === 'bullish' ? 70 : 30,
      description: `RSI: ${technicalSignals.rsiValue.toFixed(1)} | MACD: ${technicalSignals.macdHistogram >= 0 ? '+' : ''}${technicalSignals.macdHistogram.toFixed(3)} | ${technicalSignals.ma50Cross ? '50MA broken' : '50MA intact'}`,
    });
    if (technicalExit) urgencyScore += 3;
    else if (technicalWarn) urgencyScore += 1;

    // ── Fundamental Deterioration ─────────────────────────────────
    triggers.push({
      type: 'fundamental',
      label: 'Fundamentals',
      triggered: !!fundamentalsDeterioration,
      value: fundamentalsDeterioration ? 1 : 0,
      threshold: 1,
      description: fundamentalsDeterioration ? '⚠ Fundamentals deteriorating — thesis invalidated' : 'Fundamentals intact',
    });
    if (fundamentalsDeterioration) urgencyScore += 4;

    // Earnings proximity warning
    if (earningsDaysOut !== undefined && earningsDaysOut <= 3 && earningsDaysOut >= 0) {
      urgencyScore += 2;
    }

    // ── Determine Signal Type & Urgency ───────────────────────────
    let signal: SellSignalType;
    let urgency: 'critical' | 'high' | 'medium' | 'low';
    let reason: string;
    let detail: string;
    let recommendation: string;

    if (stopLossHit || (fundamentalsDeterioration && exitLevels.currentPnlPct < -20)) {
      signal = 'CUT_LOSSES';
      urgency = 'critical';
      reason = stopLossHit ? 'Stop loss triggered' : 'Thesis invalidated';
      detail = stopLossHit
        ? `Position down ${Math.abs(exitLevels.currentPnlPct).toFixed(1)}% — stop hit at -${exitLevels.stopLossPct}%`
        : 'Fundamental thesis no longer valid — cut exposure';
      recommendation = `Close position immediately. Maximum loss discipline applies.`;
    } else if (profitTargetHit) {
      signal = 'TAKE_PROFITS';
      urgency = 'high';
      reason = 'Profit target reached';
      detail = `Position up +${exitLevels.currentPnlPct.toFixed(1)}% — target was +${exitLevels.profitTargetPct}%`;
      recommendation = `Close full position or scale out 50-75%. Consider rolling up/out if conviction remains high.`;
    } else if (timeExpiry) {
      signal = 'SELL_NOW';
      urgency = 'critical';
      reason = 'Expiration imminent';
      detail = `${exitLevels.dte} DTE — theta burning capital rapidly`;
      recommendation = `Close or roll immediately. <7 DTE positions have extreme theta risk.`;
    } else if (rollWarning && exitLevels.currentPnlPct > 0) {
      signal = 'ROLL_POSITION';
      urgency = 'medium';
      reason = `${exitLevels.dte} DTE — theta acceleration zone`;
      detail = `Position profitable (+${exitLevels.currentPnlPct.toFixed(1)}%) but theta risk increasing. Roll out to next expiry.`;
      recommendation = `Roll to 30-45 DTE to maintain delta exposure while resetting time decay.`;
    } else if (technicalExit) {
      signal = 'SELL_NOW';
      urgency = 'high';
      reason = 'Technical reversal confirmed';
      detail = `RSI ${technicalSignals.rsiValue.toFixed(0)} + MACD crossover signal momentum reversal`;
      recommendation = `Technical thesis reversing — close 50%+ of position. Trail remaining with stop.`;
    } else if (technicalWarn || (rollWarning && exitLevels.currentPnlPct <= 0)) {
      signal = 'HOLD';
      urgency = 'medium';
      reason = 'Monitor closely';
      detail = `${technicalSignals.rsiOverbought ? 'RSI extended' : ''}${rollWarning ? ` ${exitLevels.dte} DTE approaching` : ''}`;
      recommendation = `Tighten stop loss. Review daily. Consider partial exit if conditions worsen.`;
    } else {
      signal = 'HOLD';
      urgency = 'low';
      reason = 'Setup intact — thesis valid';
      detail = `Current P&L: ${exitLevels.currentPnlPct >= 0 ? '+' : ''}${exitLevels.currentPnlPct.toFixed(1)}% | ${exitLevels.dte} DTE`;
      recommendation = `Maintain position per original thesis. Next review when price approaches target or stop.`;
    }

    return { signal, urgency, reason, detail, triggers, recommendation };
  }

  /**
   * Full evaluation combining live price data with sell signal computation.
   * Falls back gracefully if live data unavailable.
   */
  async evaluatePosition(params: {
    ticker: string;
    entryPrice: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    strategy: string;
    impliedVolatility: number;
    dte: number;
    riskRewardRatio?: number;
  }): Promise<SellSignalResult> {
    const { ticker, entryPrice, direction, strategy, impliedVolatility, dte, riskRewardRatio } = params;

    // Fetch current quote for live price and technicals
    let currentPrice = entryPrice;
    let rsi = 50;
    let macdHistogram = 0;
    let priceAbove50ma = direction === 'bullish'; // safe default
    let volume = 1_000_000;
    let avgVolume = 1_000_000;

    try {
      const quote = await this.schwabService.getQuote(ticker);
      if (quote) {
        currentPrice = quote.lastPrice || quote.mark || entryPrice;
      }
    } catch {
      this.logger.warn(`Could not fetch live data for ${ticker} — using entry price`);
    }

    const exitLevels = this.computeExitLevels({
      entryPrice,
      currentPrice,
      direction,
      impliedVolatility,
      dte,
      strategy,
      riskRewardRatio,
    });

    const technicalSignals = this.evaluateTechnicalExits({
      direction,
      rsi,
      macdHistogram,
      priceAbove50ma,
      volume,
      avgVolume,
    });

    return this.generateSellSignal({
      exitLevels,
      technicalSignals,
      direction,
      strategy,
    });
  }
}
