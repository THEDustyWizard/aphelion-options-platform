import { Logger } from '../utils/logger';

export interface OptionParameters {
  underlyingPrice: number;
  strikePrice: number;
  timeToExpiration: number; // in years
  riskFreeRate: number; // annual rate (e.g., 0.05 for 5%)
  volatility: number; // annual volatility (e.g., 0.2 for 20%)
  optionType: 'call' | 'put';
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number; // daily theta (negative for long options)
  vega: number; // per 1% change in volatility
  rho: number; // per 1% change in interest rate
}

export interface PositionMetrics {
  currentValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  deltaExposure: number;
  gammaExposure: number;
  thetaExposure: number; // daily theta
  vegaExposure: number;
  maxLoss: number;
  maxProfit: number;
  breakevenPrice: number;
  probabilityOfProfit: number;
}

export interface RiskMetrics {
  var95: number; // Value at Risk at 95% confidence
  expectedShortfall: number;
  portfolioBeta: number;
  correlationMatrix: number[][];
  concentrationRisk: number;
  liquidityRisk: number;
}

export class CalculationService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CalculationService');
  }

  /**
   * Calculate Black-Scholes option price
   */
  calculateBlackScholes(params: OptionParameters): number {
    const { underlyingPrice, strikePrice, timeToExpiration, riskFreeRate, volatility, optionType } = params;
    
    if (timeToExpiration <= 0) {
      // Option expired
      return optionType === 'call' 
        ? Math.max(0, underlyingPrice - strikePrice)
        : Math.max(0, strikePrice - underlyingPrice);
    }

    const d1 = (Math.log(underlyingPrice / strikePrice) + 
               (riskFreeRate + (volatility * volatility) / 2) * timeToExpiration) /
               (volatility * Math.sqrt(timeToExpiration));
    
    const d2 = d1 - volatility * Math.sqrt(timeToExpiration);
    
    const normalCDF = (x: number): number => {
      // Approximation of cumulative normal distribution
      const a1 = 0.31938153;
      const a2 = -0.356563782;
      const a3 = 1.781477937;
      const a4 = -1.821255978;
      const a5 = 1.330274429;
      const L = Math.abs(x);
      const K = 1 / (1 + 0.2316419 * L);
      let w = 1 - 1 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) *
        (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
      
      if (x < 0) {
        w = 1 - w;
      }
      return w;
    };

    const nd1 = normalCDF(d1);
    const nd2 = normalCDF(d2);
    const nMinusd1 = normalCDF(-d1);
    const nMinusd2 = normalCDF(-d2);

    if (optionType === 'call') {
      return underlyingPrice * nd1 - strikePrice * Math.exp(-riskFreeRate * timeToExpiration) * nd2;
    } else {
      return strikePrice * Math.exp(-riskFreeRate * timeToExpiration) * nMinusd2 - underlyingPrice * nMinusd1;
    }
  }

  /**
   * Calculate option Greeks
   */
  calculateGreeks(params: OptionParameters): Greeks {
    const { underlyingPrice, strikePrice, timeToExpiration, riskFreeRate, volatility, optionType } = params;
    
    if (timeToExpiration <= 0) {
      // Option expired, Greeks are 0 or at expiration values
      return {
        delta: optionType === 'call' ? (underlyingPrice > strikePrice ? 1 : 0) : (underlyingPrice < strikePrice ? -1 : 0),
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0
      };
    }

    const d1 = (Math.log(underlyingPrice / strikePrice) + 
               (riskFreeRate + (volatility * volatility) / 2) * timeToExpiration) /
               (volatility * Math.sqrt(timeToExpiration));
    
    const d2 = d1 - volatility * Math.sqrt(timeToExpiration);

    // Standard normal probability density function
    const normalPDF = (x: number): number => {
      return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-x * x / 2);
    };

    const nd1 = normalPDF(d1);
    const nd2 = normalPDF(d2);
    
    const sqrtT = Math.sqrt(timeToExpiration);
    const expRT = Math.exp(-riskFreeRate * timeToExpiration);

    // Calculate Greeks
    let delta: number;
    let gamma: number;
    let theta: number;
    let vega: number;
    let rho: number;

    if (optionType === 'call') {
      delta = this.normCDF(d1);
      gamma = nd1 / (underlyingPrice * volatility * sqrtT);
      theta = (-(underlyingPrice * volatility * nd1) / (2 * sqrtT) - 
               riskFreeRate * strikePrice * expRT * this.normCDF(d2)) / 365; // Daily theta
      vega = underlyingPrice * sqrtT * nd1 / 100; // Per 1% change
      rho = strikePrice * timeToExpiration * expRT * this.normCDF(d2) / 100; // Per 1% change
    } else {
      delta = this.normCDF(d1) - 1;
      gamma = nd1 / (underlyingPrice * volatility * sqrtT);
      theta = (-(underlyingPrice * volatility * nd1) / (2 * sqrtT) + 
               riskFreeRate * strikePrice * expRT * this.normCDF(-d2)) / 365; // Daily theta
      vega = underlyingPrice * sqrtT * nd1 / 100; // Per 1% change
      rho = -strikePrice * timeToExpiration * expRT * this.normCDF(-d2) / 100; // Per 1% change
    }

    return {
      delta,
      gamma,
      theta,
      vega,
      rho
    };
  }

  /**
   * Calculate position metrics for an option position
   */
  calculatePositionMetrics(
    params: OptionParameters,
    quantity: number,
    entryPrice: number
  ): PositionMetrics {
    const currentPrice = this.calculateBlackScholes(params);
    const greeks = this.calculateGreeks(params);
    
    const currentValue = currentPrice * quantity * 100; // Options are per 100 shares
    const costBasis = entryPrice * quantity * 100;
    const unrealizedPnl = currentValue - costBasis;
    const unrealizedPnlPercent = costBasis !== 0 ? (unrealizedPnl / costBasis) * 100 : 0;
    
    // Calculate exposures
    const deltaExposure = greeks.delta * quantity * 100;
    const gammaExposure = greeks.gamma * quantity * 100;
    const thetaExposure = greeks.theta * quantity * 100; // Daily theta
    const vegaExposure = greeks.vega * quantity * 100;
    
    // Calculate max loss and profit
    let maxLoss = 0;
    let maxProfit = 0;
    let breakevenPrice = 0;
    
    if (params.optionType === 'call') {
      if (quantity > 0) { // Long call
        maxLoss = -costBasis;
        maxProfit = Infinity;
        breakevenPrice = params.strikePrice + entryPrice;
      } else { // Short call
        maxLoss = Infinity;
        maxProfit = costBasis;
        breakevenPrice = params.strikePrice + entryPrice;
      }
    } else { // Put
      if (quantity > 0) { // Long put
        maxLoss = -costBasis;
        maxProfit = params.strikePrice * quantity * 100 - costBasis;
        breakevenPrice = params.strikePrice - entryPrice;
      } else { // Short put
        maxLoss = params.strikePrice * quantity * 100 - costBasis;
        maxProfit = costBasis;
        breakevenPrice = params.strikePrice - entryPrice;
      }
    }
    
    // Calculate probability of profit (simplified)
    const probabilityOfProfit = this.calculateProbabilityOfProfit(params);
    
    return {
      currentValue,
      costBasis,
      unrealizedPnl,
      unrealizedPnlPercent,
      deltaExposure,
      gammaExposure,
      thetaExposure,
      vegaExposure,
      maxLoss,
      maxProfit,
      breakevenPrice,
      probabilityOfProfit
    };
  }

  /**
   * Calculate probability of profit for an option
   */
  private calculateProbabilityOfProfit(params: OptionParameters): number {
    const { underlyingPrice, strikePrice, timeToExpiration, volatility, optionType } = params;
    
    if (timeToExpiration <= 0) {
      return optionType === 'call' 
        ? (underlyingPrice > strikePrice ? 1 : 0)
        : (underlyingPrice < strikePrice ? 1 : 0);
    }
    
    const d2 = (Math.log(underlyingPrice / strikePrice) - 
               (volatility * volatility / 2) * timeToExpiration) /
               (volatility * Math.sqrt(timeToExpiration));
    
    if (optionType === 'call') {
      return this.normCDF(d2);
    } else {
      return this.normCDF(-d2);
    }
  }

  /**
   * Calculate risk metrics for a portfolio
   */
  calculatePortfolioRiskMetrics(
    positions: Array<{
      symbol: string;
      quantity: number;
      currentPrice: number;
      beta?: number;
      volatility?: number;
    }>,
    portfolioValue: number
  ): RiskMetrics {
    if (positions.length === 0 || portfolioValue <= 0) {
      return {
        var95: 0,
        expectedShortfall: 0,
        portfolioBeta: 0,
        correlationMatrix: [],
        concentrationRisk: 0,
        liquidityRisk: 0
      };
    }
    
    // Calculate portfolio beta (weighted average)
    let portfolioBeta = 0;
    positions.forEach(pos => {
      const weight = (pos.currentPrice * Math.abs(pos.quantity)) / portfolioValue;
      portfolioBeta += weight * (pos.beta || 1);
    });
    
    // Calculate concentration risk (Herfindahl-Hirschman Index)
    let hhi = 0;
    positions.forEach(pos => {
      const weight = (pos.currentPrice * Math.abs(pos.quantity)) / portfolioValue;
      hhi += weight * weight;
    });
    const concentrationRisk = hhi * 10000; // Scale to 0-10000
    
    // Calculate VaR (simplified - using parametric method)
    let portfolioVolatility = 0;
    positions.forEach(pos => {
      const weight = (pos.currentPrice * Math.abs(pos.quantity)) / portfolioValue;
      portfolioVolatility += weight * weight * Math.pow(pos.volatility || 0.3, 2);
    });
    portfolioVolatility = Math.sqrt(portfolioVolatility);
    
    // 95% VaR (1.645 standard deviations)
    const var95 = portfolioValue * portfolioVolatility * 1.645;
    
    // Expected shortfall (average loss beyond VaR)
    const expectedShortfall = portfolioValue * portfolioVolatility * 2.063;
    
    // Liquidity risk (simplified - based on position size relative to average daily volume)
    const liquidityRisk = positions.reduce((maxRisk, pos) => {
      const positionValue = pos.currentPrice * Math.abs(pos.quantity);
      // Assume larger positions relative to portfolio are less liquid
      return Math.max(maxRisk, positionValue / portfolioValue);
    }, 0);
    
    // Correlation matrix (placeholder - would need historical data)
    const correlationMatrix: number[][] = [];
    for (let i = 0; i < positions.length; i++) {
      correlationMatrix[i] = [];
      for (let j = 0; j < positions.length; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
        } else {
          // Simplified correlation - would need actual data
          correlationMatrix[i][j] = 0.3;
        }
      }
    }
    
    return {
      var95,
      expectedShortfall,
      portfolioBeta,
      correlationMatrix,
      concentrationRisk,
      liquidityRisk
    };
  }

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
  } {
    const weights = {
      technical: 0.3,
      fundamental: 0.25,
      sentiment: 0.2,
      sectorMomentum: 0.15,
      optionsFlow: 0.1
    };
    
    // Calculate weighted score
    const weightedScores = {
      technical: data.technicalScore * weights.technical,
      fundamental: data.fundamentalScore * weights.fundamental,
      sentiment: data.sentimentScore * weights.sentiment,
      sectorMomentum: data.sectorMomentumScore * weights.sectorMomentum,
      optionsFlow: data.optionsFlowScore * weights.optionsFlow
    };
    
    const overallScore = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);
    
    // Calculate confidence based on score consistency
    const scores = [
      data.technicalScore,
      data.fundamentalScore,
      data.sentimentScore,
      data.sectorMomentumScore,
      data.optionsFlowScore
    ];
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher confidence when scores are consistent (low std dev) and overall score is high
    const consistency = 1 - (stdDev / 50); // Normalize to 0-1 range
    const confidence = (overallScore / 100) * consistency * 100;
    
    return {
      overallScore,
      weightedScores,
      confidence: Math.min(100, Math.max(0, confidence))
    };
  }

  /**
   * Calculate implied volatility using Newton-Raphson method
   */
  calculateImpliedVolatility(
    marketPrice: number,
    params: Omit<OptionParameters, 'volatility'>
  ): number {
    const { underlyingPrice, strikePrice, timeToExpiration, riskFreeRate, optionType } = params;
    
    if (timeToExpiration <= 0) {
      return 0;
    }
    
    // Initial guess for volatility
    let volatility = 0.3;
    let price = 0;
    let vega = 0;
    let iteration = 0;
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    while (iteration < maxIterations) {
      const calcParams: OptionParameters = {
        underlyingPrice,
        strikePrice,
        timeToExpiration,
        riskFreeRate,
        volatility,
        optionType
      };
      
      price = this.calculateBlackScholes(calcParams);
      const greeks = this.calculateGreeks(calcParams);
      vega = greeks.vega * 100; // Convert to per 1 vol point
      
      const priceDifference = price - marketPrice;
      
      if (Math.abs(priceDifference) < tolerance) {
        break;
      }
      
      // Newton-Raphson update
      volatility = volatility - priceDifference / vega;
      
      // Ensure volatility stays within reasonable bounds
      volatility = Math.max(0.001, Math.min(5.0, volatility));
      
      iteration++;
    }
    
    return volatility;
  }

  /**
   * Helper function: Cumulative normal distribution
   */
  private normCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.31938153;
    const a2 = -0.356563782;
    const a3 = 1.781477937;
    const a4 = -1.821255978;
    const a5 = 1.330274429;
    const L = Math.abs(x);
    const K = 1 / (1 + 0.2316419 * L);
    let w = 1 - 1 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) *
      (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
    
    if (x < 0) {
      w = 1 - w;
    }
    return w;
  }
}