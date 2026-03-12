export interface OptionParameters {
    underlyingPrice: number;
    strikePrice: number;
    timeToExpiration: number;
    riskFreeRate: number;
    volatility: number;
    optionType: 'call' | 'put';
}
export interface Greeks {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
}
export interface PositionMetrics {
    currentValue: number;
    costBasis: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
    deltaExposure: number;
    gammaExposure: number;
    thetaExposure: number;
    vegaExposure: number;
    maxLoss: number;
    maxProfit: number;
    breakevenPrice: number;
    probabilityOfProfit: number;
}
export interface RiskMetrics {
    var95: number;
    expectedShortfall: number;
    portfolioBeta: number;
    correlationMatrix: number[][];
    concentrationRisk: number;
    liquidityRisk: number;
}
export declare class CalculationService {
    private logger;
    constructor();
    /**
     * Calculate Black-Scholes option price
     */
    calculateBlackScholes(params: OptionParameters): number;
    /**
     * Calculate option Greeks
     */
    calculateGreeks(params: OptionParameters): Greeks;
    /**
     * Calculate position metrics for an option position
     */
    calculatePositionMetrics(params: OptionParameters, quantity: number, entryPrice: number): PositionMetrics;
    /**
     * Calculate probability of profit for an option
     */
    private calculateProbabilityOfProfit;
    /**
     * Calculate risk metrics for a portfolio
     */
    calculatePortfolioRiskMetrics(positions: Array<{
        symbol: string;
        quantity: number;
        currentPrice: number;
        beta?: number;
        volatility?: number;
    }>, portfolioValue: number): RiskMetrics;
    /**
     * Calculate 5-factor scoring algorithm
     */
    calculateFiveFactorScore(data: {
        technicalScore: number;
        fundamentalScore: number;
        sentimentScore: number;
        sectorMomentumScore: number;
        optionsFlowScore: number;
    }): {
        overallScore: number;
        weightedScores: Record<string, number>;
        confidence: number;
    };
    /**
     * Calculate implied volatility using Newton-Raphson method
     */
    calculateImpliedVolatility(marketPrice: number, params: Omit<OptionParameters, 'volatility'>): number;
    /**
     * Helper function: Cumulative normal distribution
     */
    private normCDF;
}
//# sourceMappingURL=calculation.service.d.ts.map