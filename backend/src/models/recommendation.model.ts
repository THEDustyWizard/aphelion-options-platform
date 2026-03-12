import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Ticker } from './ticker.model';

@Entity('recommendations')
@Index(['tickerId', 'generatedAt'])
@Index(['confidence'])
@Index(['riskScore'])
@Index(['strategy'])
@Index(['expirationDate'])
export class Recommendation extends BaseEntity {
  @ManyToOne(() => Ticker, (ticker) => ticker.recommendations, { nullable: false })
  @JoinColumn({ name: 'tickerId' })
  ticker!: Ticker;

  @Column()
  tickerId!: string;

  @Column({
    type: 'enum',
    enum: ['defense', 'energy', 'logistics', 'medical']
  })
  sector!: string;

  @Column('decimal', { precision: 5, scale: 2 })
  confidence!: number; // 0-100

  @Column('decimal', { precision: 5, scale: 2 })
  riskScore!: number; // 0-100 (lower is better)

  @Column({
    type: 'enum',
    enum: [
      'Long Call',
      'Long Put',
      'Bull Call Spread',
      'Bear Put Spread',
      'Iron Condor',
      'Strangle',
      'Straddle',
      'Calendar Spread',
      'Diagonal Spread'
    ]
  })
  strategy!: string;

  @Column({
    type: 'enum',
    enum: ['bullish', 'mildly_bullish', 'neutral', 'bearish', 'mildly_bearish']
  })
  direction!: string;

  @Column('integer')
  expirationDays!: number;

  @Column('date')
  expirationDate!: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  strikePrice!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  currentPrice!: number | null;

  @Column('text')
  rationale!: string;

  @Column('jsonb')
  scores!: {
    technical: number;
    fundamental: number;
    sentiment: number;
    sectorMomentum: number;
    optionsFlow: number;
    total: number;
  };

  @Column('jsonb', { nullable: true })
  riskFactors!: {
    volatility: number;
    liquidity: number;
    sector: number;
    company: number;
    strategy: number;
    total: number;
  } | null;

  @Column('jsonb', { nullable: true })
  optionsParameters!: {
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

  @Column('timestamptz')
  generatedAt!: Date;

  @Column('timestamptz')
  validUntil!: Date;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: false })
  executed!: boolean;

  @Column('timestamptz', { nullable: true })
  executedAt!: Date | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  executionPrice!: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  pnl!: number | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  pnlPercentage!: number | null;

  @Column('jsonb', { nullable: true })
  backtestData!: {
    simulatedEntryPrice: number;
    simulatedExitPrice: number;
    simulatedPnl: number;
    simulatedPnlPercentage: number;
    maxDrawdown: number;
    winProbability: number;
  } | null;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.validUntil;
  }

  isProfitable(): boolean | null {
    if (this.pnl === null) return null;
    return this.pnl > 0;
  }

  getDaysToExpiration(): number {
    const now = new Date();
    const diffTime = this.expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getConfidenceLevel(): string {
    if (this.confidence >= 80) return 'high';
    if (this.confidence >= 60) return 'medium';
    return 'low';
  }

  getRiskLevel(): string {
    if (this.riskScore <= 30) return 'low';
    if (this.riskScore <= 50) return 'medium';
    if (this.riskScore <= 70) return 'high';
    return 'extreme';
  }

  getPositionSize(accountSize: number): number {
    // Kelly Criterion variant for position sizing
    const baseAllocation = this.getBaseAllocation();
    const riskAdjustment = this.getRiskAdjustment();

    let positionSize = accountSize * baseAllocation * riskAdjustment;

    // Apply limits
    positionSize = Math.max(1000, Math.min(positionSize, accountSize * 0.1));

    return positionSize;
  }

  private getBaseAllocation(): number {
    if (this.confidence >= 80 && this.riskScore <= 30) return 0.05; // 5%
    if (this.confidence >= 70 && this.riskScore <= 40) return 0.03; // 3%
    if (this.confidence >= 60 && this.riskScore <= 50) return 0.02; // 2%
    return 0.01; // 1%
  }

  private getRiskAdjustment(): number {
    // Adjust for risk concentration
    // In a real implementation, this would check current sector allocations
    return 1.0;
  }
}
