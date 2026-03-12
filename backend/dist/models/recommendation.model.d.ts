import { BaseEntity } from './base.entity';
import { Ticker } from './ticker.model';
export declare class Recommendation extends BaseEntity {
    ticker: Ticker;
    tickerId: string;
    sector: string;
    confidence: number;
    riskScore: number;
    strategy: string;
    direction: string;
    expirationDays: number;
    expirationDate: Date;
    strikePrice: number;
    currentPrice: number | null;
    rationale: string;
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
    } | null;
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
    generatedAt: Date;
    validUntil: Date;
    active: boolean;
    executed: boolean;
    executedAt: Date | null;
    executionPrice: number | null;
    pnl: number | null;
    pnlPercentage: number | null;
    backtestData: {
        simulatedEntryPrice: number;
        simulatedExitPrice: number;
        simulatedPnl: number;
        simulatedPnlPercentage: number;
        maxDrawdown: number;
        winProbability: number;
    } | null;
    isExpired(): boolean;
    isProfitable(): boolean | null;
    getDaysToExpiration(): number;
    getConfidenceLevel(): string;
    getRiskLevel(): string;
    getPositionSize(accountSize: number): number;
    private getBaseAllocation;
    private getRiskAdjustment;
}
//# sourceMappingURL=recommendation.model.d.ts.map