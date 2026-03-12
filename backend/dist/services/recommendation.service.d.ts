import { Recommendation } from '../models/recommendation.model';
export interface RecommendationRequest {
    ticker: string;
    sector: string;
    lookbackDays?: number;
    includeOptionsAnalysis?: boolean;
    includeNewsSentiment?: boolean;
}
export interface RecommendationResult {
    ticker: string;
    sector: string;
    confidence: number;
    riskScore: number;
    strategy: string;
    direction: string;
    expirationDays: number;
    strikePrice: number;
    currentPrice: number;
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
    generatedAt: Date;
    validUntil: Date;
}
export declare class RecommendationService {
    private logger;
    private schwabService;
    private newsService;
    private pythonProcess;
    constructor();
    generateRecommendation(request: RecommendationRequest): Promise<RecommendationResult>;
    generateBatchRecommendations(requests: RecommendationRequest[], maxConcurrent?: number): Promise<RecommendationResult[]>;
    getRecentRecommendations(ticker: string, limit: number): Promise<Recommendation[]>;
    getTopRecommendationsBySector(sector: string, limit: number): Promise<Recommendation[]>;
    backtestRecommendation(id: string, endDate: Date): Promise<any>;
    updateRecommendationStatus(id: string, updates: any): Promise<Recommendation>;
    private selectStrategy;
    /**
     * Calculate option parameters (expiration and strike)
     */
    private calculateOptionParameters;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Calculate risk score
     */
    private calculateRiskScore;
    /**
     * Calculate valid until date
     */
    private calculateValidUntil;
    /**
     * Save recommendation to database
     */
    private saveRecommendation;
    /**
     * Analyze options chain
     */
    private analyzeOptions;
    /**
     * Find at-the-money strike
     */
    private findAtTheMoneyStrike;
    /**
     * Find strike above price
     */
    private findStrikeAbove;
    /**
     * Find strike below price
     */
    private findStrikeBelow;
    /**
     * Get sector ETF symbol
     */
    private getSectorETF;
    /**
     * Simulate trade for backtesting
     */
    private simulateTrade;
    /**
     * Clean up Python process
     */
    cleanup(): void;
}
//# sourceMappingURL=recommendation.service.d.ts.map