import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Recommendation } from './recommendation.model';
import { OptionChain } from './optionChain.model';
import { NewsArticle } from './newsArticle.model';

@Entity('tickers')
@Index(['symbol'], { unique: true })
@Index(['sector'])
@Index(['marketCap'])
export class Ticker extends BaseEntity {
  @Column({ length: 10 })
  symbol!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ['defense', 'energy', 'logistics', 'medical', 'other'],
    default: 'other'
  })
  sector!: string;

  @Column('decimal', { precision: 20, scale: 2, nullable: true })
  marketCap!: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price!: number | null;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  volume!: number | null;

  @Column({ default: false })
  hasOptions!: boolean;

  @Column({ default: true })
  active!: boolean;

  @Column('jsonb', { nullable: true })
  fundamentals!: {
    peRatio: number | null;
    eps: number | null;
    dividendYield: number | null;
    beta: number | null;
    debtToEquity: number | null;
    roic: number | null;
    revenueGrowth: number | null;
    operatingMargin: number | null;
    freeCashFlow: number | null;
    profitMargin: number | null;
    rndGrowth: number | null;
    updatedAt: Date;
  } | null;

  @Column('jsonb', { nullable: true })
  technicals!: {
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    atrPercent: number | null;
    bollingerPosition: number | null;
    supportDistance: number | null;
    resistanceDistance: number | null;
    updatedAt: Date;
  } | null;

  @Column('timestamptz', { nullable: true })
  lastUpdated!: Date | null;

  @OneToMany(() => Recommendation, (recommendation) => recommendation.ticker)
  recommendations!: Recommendation[];

  @OneToMany(() => OptionChain, (optionChain) => optionChain.ticker)
  optionChains!: OptionChain[];

  @OneToMany(() => NewsArticle, (newsArticle) => newsArticle.ticker)
  newsArticles!: NewsArticle[];

  // Helper methods
  getSectorETF(): string {
    const sectorETFs = {
      defense: 'ITA',
      energy: 'XLE',
      logistics: 'XLI',
      medical: 'XLV',
      other: 'SPY'
    };
    return sectorETFs[this.sector as keyof typeof sectorETFs] || 'SPY';
  }

  isLargeCap(): boolean {
    return this.marketCap ? this.marketCap >= 10_000_000_000 : false; // $10B+
  }

  isMidCap(): boolean {
    return this.marketCap ? this.marketCap >= 2_000_000_000 && this.marketCap < 10_000_000_000 : false; // $2B-$10B
  }

  isSmallCap(): boolean {
    return this.marketCap ? this.marketCap < 2_000_000_000 : false; // <$2B
  }

  getMarketCapCategory(): string {
    if (this.isLargeCap()) return 'large';
    if (this.isMidCap()) return 'mid';
    if (this.isSmallCap()) return 'small';
    return 'unknown';
  }
}