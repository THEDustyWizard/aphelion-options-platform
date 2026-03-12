import { BaseEntity } from './base.entity';
import { Ticker } from './ticker.model';
export declare class OptionChain extends BaseEntity {
    ticker: Ticker;
    tickerId: string;
    expiration: Date;
    underlyingPrice: number;
    impliedVolatility: number;
    calls: Array<{
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
    puts: Array<{
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
    greeks: {
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
    volumeAnalysis: {
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
    openInterestAnalysis: {
        totalOpenInterest: number;
        callOpenInterest: number;
        putOpenInterest: number;
        putCallRatio: number;
        maxPain: number;
        gammaExposure: number;
    } | null;
    updatedAt: Date;
    active: boolean;
    getDaysToExpiration(): number;
    getAtTheMoneyStrike(): number;
    getStrikeRange(): {
        min: number;
        max: number;
    };
    getOptionByStrike(strike: number, type: 'call' | 'put'): any | null;
    getVolumeSkew(): number;
    getOpenInterestSkew(): number;
    getLiquidityScore(): number;
    findBestSpread(type: 'bull' | 'bear' | 'neutral', maxWidthPercent?: number): {
        long: any;
        short: any;
        width: number;
        credit: number;
    } | null;
}
//# sourceMappingURL=optionChain.model.d.ts.map