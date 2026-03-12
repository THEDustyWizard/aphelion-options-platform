import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Ticker } from './ticker.model';

@Entity('option_chains')
@Index(['tickerId', 'expiration'])
@Index(['updatedAt'])
export class OptionChain extends BaseEntity {
  @ManyToOne(() => Ticker, (ticker) => ticker.optionChains, { nullable: false })
  @JoinColumn({ name: 'tickerId' })
  ticker!: Ticker;

  @Column()
  tickerId!: string;

  @Column('date')
  expiration!: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  underlyingPrice!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  impliedVolatility!: number;

  @Column('jsonb')
  calls!: Array<{
    strike: number;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    openInterest: number;
    impliedVolatility: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    inTheMoney: boolean;
    bidAskSpread: number;
    midPrice: number;
  }>;

  @Column('jsonb')
  puts!: Array<{
    strike: number;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    openInterest: number;
    impliedVolatility: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    inTheMoney: boolean;
    bidAskSpread: number;
    midPrice: number;
  }>;

  @Column('jsonb', { nullable: true })
  greeks!: {
    atmDelta: number;
    atmGamma: number;
    atmTheta: number;
    atmVega: number;
    skew: number;
    termStructure: Array<{
      daysToExpiration: number;
      impliedVolatility: number;
    }>;
  } | null;

  @Column('jsonb', { nullable: true })
  volumeAnalysis!: {
    totalVolume: number;
    callVolume: number;
    putVolume: number;
    callPutRatio: number;
    unusualVolume: boolean;
    largestTrade: {
      type: 'call' | 'put';
      strike: number;
      premium: number;
      volume: number;
    } | null;
  } | null;

  @Column('jsonb', { nullable: true })
  openInterestAnalysis!: {
    totalOpenInterest: number;
    callOpenInterest: number;
    putOpenInterest: number;
    putCallRatio: number;
    maxPain: number;
    gammaExposure: number;
  } | null;

  declare updatedAt: Date;

  @Column({ default: true })
  active!: boolean;

  // Helper methods
  getDaysToExpiration(): number {
    const now = new Date();
    const diffTime = this.expiration.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getAtTheMoneyStrike(): number {
    const strikes = [...this.calls, ...this.puts].map(opt => opt.strike);
    const underlying = this.underlyingPrice;
    
    // Find strike closest to underlying price
    return strikes.reduce((prev, curr) => {
      return Math.abs(curr - underlying) < Math.abs(prev - underlying) ? curr : prev;
    });
  }

  getStrikeRange(): { min: number; max: number } {
    const strikes = [...this.calls, ...this.puts].map(opt => opt.strike);
    return {
      min: Math.min(...strikes),
      max: Math.max(...strikes)
    };
  }

  getOptionByStrike(strike: number, type: 'call' | 'put'): any | null {
    const options = type === 'call' ? this.calls : this.puts;
    return options.find(opt => opt.strike === strike) || null;
  }

  getVolumeSkew(): number {
    if (!this.volumeAnalysis) return 0;
    return this.volumeAnalysis.callPutRatio - 1;
  }

  getOpenInterestSkew(): number {
    if (!this.openInterestAnalysis) return 0;
    return this.openInterestAnalysis.putCallRatio - 1;
  }

  getLiquidityScore(): number {
    // Score based on bid-ask spreads and volume
    let totalScore = 0;
    let count = 0;
    
    [...this.calls, ...this.puts].forEach(option => {
      if (option.bid > 0 && option.ask > 0) {
        const spreadPercent = option.bidAskSpread / option.midPrice;
        let spreadScore = 100;
        
        if (spreadPercent > 0.1) spreadScore = 20;
        else if (spreadPercent > 0.05) spreadScore = 40;
        else if (spreadPercent > 0.02) spreadScore = 60;
        else if (spreadPercent > 0.01) spreadScore = 80;
        
        totalScore += spreadScore;
        count++;
      }
    });
    
    return count > 0 ? totalScore / count : 0;
  }

  findBestSpread(
    type: 'bull' | 'bear' | 'neutral',
    maxWidthPercent: number = 0.1
  ): { long: any; short: any; width: number; credit: number } | null {
    const underlying = this.underlyingPrice;
    const maxWidth = underlying * maxWidthPercent;
    
    if (type === 'bull') {
      // Bull call spread: buy lower strike call, sell higher strike call
      const callsSorted = [...this.calls].sort((a, b) => a.strike - b.strike);
      
      for (let i = 0; i < callsSorted.length - 1; i++) {
        const longCall = callsSorted[i];
        const shortCall = callsSorted[i + 1];
        const width = shortCall.strike - longCall.strike;
        
        if (width <= maxWidth && longCall.ask > 0 && shortCall.bid > 0) {
          const debit = longCall.ask - shortCall.bid;
          if (debit < width) { // Positive expected value
            return {
              long: longCall,
              short: shortCall,
              width,
              credit: -debit // Negative debit = credit
            };
          }
        }
      }
    } else if (type === 'bear') {
      // Bear put spread: buy higher strike put, sell lower strike put
      const putsSorted = [...this.puts].sort((a, b) => b.strike - a.strike);
      
      for (let i = 0; i < putsSorted.length - 1; i++) {
        const longPut = putsSorted[i];
        const shortPut = putsSorted[i + 1];
        const width = longPut.strike - shortPut.strike;
        
        if (width <= maxWidth && longPut.ask > 0 && shortPut.bid > 0) {
          const debit = longPut.ask - shortPut.bid;
          if (debit < width) {
            return {
              long: longPut,
              short: shortPut,
              width,
              credit: -debit
            };
          }
        }
      }
    } else if (type === 'neutral') {
      // Iron condor: sell OTM call spread + sell OTM put spread
      // Simplified version - in production would be more sophisticated
      const atmStrike = this.getAtTheMoneyStrike();
      const otmCalls = this.calls.filter(c => c.strike > atmStrike);
      const otmPuts = this.puts.filter(p => p.strike < atmStrike);
      
      if (otmCalls.length >= 2 && otmPuts.length >= 2) {
        // Find call spread
        const callSpread = this.findBestSpread('bull', maxWidthPercent);
        const putSpread = this.findBestSpread('bear', maxWidthPercent);
        
        if (callSpread && putSpread) {
          return {
            long: null, // Iron condor has no long legs
            short: { callSpread, putSpread },
            width: callSpread.width + putSpread.width,
            credit: callSpread.credit + putSpread.credit
          };
        }
      }
    }
    
    return null;
  }
}