import { Router, Request, Response } from 'express';
import { CalculationService, OptionParameters, Greeks, PositionMetrics, RiskMetrics } from '../services/calculation.service';
import { Logger } from '../utils/logger';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimiter';

const router = Router();
const logger = new Logger('CalculationRoutes');
const calculationService = new CalculationService();

/**
 * @swagger
 * /calculation/option-price:
 *   post:
 *     summary: Calculate option price using Black-Scholes
 *     tags: [Calculation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - underlyingPrice
 *               - strikePrice
 *               - timeToExpiration
 *               - riskFreeRate
 *               - volatility
 *               - optionType
 *             properties:
 *               underlyingPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 100
 *               strikePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 105
 *               timeToExpiration:
 *                 type: number
 *                 minimum: 0
 *                 description: Time to expiration in years
 *                 example: 0.25
 *               riskFreeRate:
 *                 type: number
 *                 minimum: 0
 *                 description: Annual risk-free rate (e.g., 0.05 for 5%)
 *                 example: 0.05
 *               volatility:
 *                 type: number
 *                 minimum: 0
 *                 description: Annual volatility (e.g., 0.2 for 20%)
 *                 example: 0.2
 *               optionType:
 *                 type: string
 *                 enum: [call, put]
 *                 example: call
 *     responses:
 *       200:
 *         description: Option price calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 price:
 *                   type: number
 *                   example: 3.45
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/option-price', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const params: OptionParameters = req.body;
    
    // Validate required parameters
    const required = ['underlyingPrice', 'strikePrice', 'timeToExpiration', 'riskFreeRate', 'volatility', 'optionType'];
    for (const field of required) {
      if (params[field as keyof OptionParameters] === undefined) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Missing required field: ${field}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Validate parameter ranges
    if (params.underlyingPrice < 0 || params.strikePrice < 0 || params.timeToExpiration < 0 || 
        params.riskFreeRate < 0 || params.volatility < 0) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'All numeric parameters must be non-negative',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!['call', 'put'].includes(params.optionType)) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'optionType must be either "call" or "put"',
        timestamp: new Date().toISOString()
      });
    }
    
    const price = calculationService.calculateBlackScholes(params);
    
    res.json({ price });
  } catch (error: any) {
    logger.error('Failed to calculate option price:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /calculation/greeks:
 *   post:
 *     summary: Calculate option Greeks
 *     tags: [Calculation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - underlyingPrice
 *               - strikePrice
 *               - timeToExpiration
 *               - riskFreeRate
 *               - volatility
 *               - optionType
 *             properties:
 *               underlyingPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 100
 *               strikePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 105
 *               timeToExpiration:
 *                 type: number
 *                 minimum: 0
 *                 description: Time to expiration in years
 *                 example: 0.25
 *               riskFreeRate:
 *                 type: number
 *                 minimum: 0
 *                 description: Annual risk-free rate (e.g., 0.05 for 5%)
 *                 example: 0.05
 *               volatility:
 *                 type: number
 *                 minimum: 0
 *                 description: Annual volatility (e.g., 0.2 for 20%)
 *                 example: 0.2
 *               optionType:
 *                 type: string
 *                 enum: [call, put]
 *                 example: call
 *     responses:
 *       200:
 *         description: Greeks calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Greeks'
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/greeks', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const params: OptionParameters = req.body;
    
    // Validate required parameters
    const required = ['underlyingPrice', 'strikePrice', 'timeToExpiration', 'riskFreeRate', 'volatility', 'optionType'];
    for (const field of required) {
      if (params[field as keyof OptionParameters] === undefined) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Missing required field: ${field}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Validate parameter ranges
    if (params.underlyingPrice < 0 || params.strikePrice < 0 || params.timeToExpiration < 0 || 
        params.riskFreeRate < 0 || params.volatility < 0) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'All numeric parameters must be non-negative',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!['call', 'put'].includes(params.optionType)) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'optionType must be either "call" or "put"',
        timestamp: new Date().toISOString()
      });
    }
    
    const greeks = calculationService.calculateGreeks(params);
    
    res.json(greeks);
  } catch (error: any) {
    logger.error('Failed to calculate Greeks:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /calculation/position-metrics:
 *   post:
 *     summary: Calculate position metrics for an option position
 *     tags: [Calculation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - params
 *               - quantity
 *               - entryPrice
 *             properties:
 *               params:
 *                 $ref: '#/components/schemas/OptionParameters'
 *               quantity:
 *                 type: integer
 *                 description: Number of contracts (positive for long, negative for short)
 *                 example: 1
 *               entryPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Entry price per option
 *                 example: 3.45
 *     responses:
 *       200:
 *         description: Position metrics calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PositionMetrics'
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/position-metrics', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { params, quantity, entryPrice } = req.body;
    
    if (!params || quantity === undefined || entryPrice === undefined) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: params, quantity, entryPrice',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate option parameters
    const optionParams: OptionParameters = params;
    const required = ['underlyingPrice', 'strikePrice', 'timeToExpiration', 'riskFreeRate', 'volatility', 'optionType'];
    for (const field of required) {
      if (optionParams[field as keyof OptionParameters] === undefined) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Missing required field in params: ${field}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'quantity must be an integer',
        timestamp: new Date().toISOString()
      });
    }
    
    if (entryPrice < 0) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'entryPrice must be non-negative',
        timestamp: new Date().toISOString()
      });
    }
    
    const metrics = calculationService.calculatePositionMetrics(optionParams, quantity, entryPrice);
    
    res.json(metrics);
  } catch (error: any) {
    logger.error('Failed to calculate position metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /calculation/portfolio-risk:
 *   post:
 *     summary: Calculate risk metrics for a portfolio
 *     tags: [Calculation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - positions
 *               - portfolioValue
 *             properties:
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - symbol
 *                     - quantity
 *                     - currentPrice
 *                   properties:
 *                     symbol:
 *                       type: string
 *                       example: AAPL
 *                     quantity:
 *                       type: number
 *                       example: 100
 *                     currentPrice:
 *                       type: number
 *                       example: 175.25
 *                     beta:
 *                       type: number
 *                       example: 1.2
 *                     volatility:
 *                       type: number
 *                       example: 0.25
 *               portfolioValue:
 *                 type: number
 *                 minimum: 0
 *                 example: 100000
 *     responses:
 *       200:
 *         description: Risk metrics calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RiskMetrics'
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/portfolio-risk', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { positions, portfolioValue } = req.body;
    
    if (!Array.isArray(positions) || portfolioValue === undefined) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: positions (array), portfolioValue',
        timestamp: new Date().toISOString()
      });
    }
    
    if (portfolioValue < 0) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'portfolioValue must be non-negative',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate positions
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (!pos.symbol || pos.quantity === undefined || pos.currentPrice === undefined) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Position ${i} missing required fields: symbol, quantity, currentPrice`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (pos.currentPrice < 0) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Position ${i}: currentPrice must be non-negative`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const riskMetrics = calculationService.calculatePortfolioRiskMetrics(positions, portfolioValue);
    
    res.json(riskMetrics);
  } catch (error: any) {
    logger.error('Failed to calculate portfolio risk:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /calculation/five-factor-score:
 *   post:
 *     summary: Calculate 5-factor scoring algorithm
 *     tags: [Calculation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - technicalScore
 *               - fundamentalScore
 *               - sentimentScore
 *               - sectorMomentumScore
 *               - optionsFlowScore
 *             properties:
 *               technicalScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 75
 *               fundamentalScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 80
 *               sentimentScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 65
 *               sectorMomentumScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 70
 *               optionsFlowScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 85
 *     responses:
 *       200:
 *         description: 5-factor score calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overallScore:
 *                   type: number
 *                   example: 75.5
 *                 weightedScores:
 *                   type: object
 *                   properties:
 *                     technical:
 *                       type: number
 *                       example: 22.5
 *                     fundamental:
 *                       type: number
 *                       example: 20.0
 *                     sentiment:
 *                       type: number
 *                       example: 13.0
 *                     sectorMomentum:
 *                       type: number
 *                       example: 10.5
 *                     optionsFlow:
 *                       type: number
 *                       example: 8.5
 *                 confidence:
 *                   type: number
 *                   example: 78.2
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/five-factor-score', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { technicalScore, fundamentalScore, sentimentScore, sectorMomentumScore, optionsFlowScore } = req.body;
    
    // Validate required scores
    const scores = {
      technicalScore,
      fundamentalScore,
      sentimentScore,
      sectorMomentumScore,
      optionsFlowScore
    };
    
    for (const [key, value] of Object.entries(scores)) {
      if (value === undefined) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Missing required field: ${key}`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (typeof value !== 'number' || value < 0 || value > 100) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `${key} must be a number between 0 and 100`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const result = calculationService.calculateFiveFactorScore({
      technicalScore,
      fundamentalScore,
      sentimentScore,
      sectorMomentumScore,
      optionsFlowScore
    });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Failed to calculate 5-factor score:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /calculation/implied-volatility:
 *   post:
 *     summary: Calculate implied volatility
 *     tags: [Calculation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - marketPrice
 *               - underlyingPrice
 *               - strikePrice
 *               - timeToExpiration
 *               - riskFreeRate
 *               - optionType
 *             properties:
 *               marketPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Current market price of the option
 *                 example: 3.45
 *               underlyingPrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 100
 *               strikePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 105
 *               timeToExpiration:
 *                 type: number
 *                 minimum: 0
 *                 description: Time to expiration in years
 *                 example: 0.25
 *               riskFreeRate:
 *                 type: number
 *                 minimum: 0
 *                 example: 0.05
 *               optionType:
 *                 type: string
 *                 enum: [call, put]
 *                 example: call
 *     responses:
 *       200:
 *         description: Implied volatility calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 impliedVolatility:
 *                   type: number
 *                   example: 0.25
 *                 annualizedPercent:
 *                   type: number
 *                   example: 25.00
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/implied-volatility', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { marketPrice, underlyingPrice, strikePrice, timeToExpiration, riskFreeRate, optionType } = req.body;

    const required: Record<string, unknown> = { marketPrice, underlyingPrice, strikePrice, timeToExpiration, riskFreeRate, optionType };
    for (const [key, value] of Object.entries(required)) {
      if (value === undefined || value === null) {
        return void res.status(400).json({
          error: 'Bad Request',
          message: `Missing required field: ${key}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (typeof marketPrice !== 'number' || marketPrice <= 0) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'marketPrice must be a positive number',
        timestamp: new Date().toISOString()
      });
    }

    const impliedVolatility = calculationService.calculateImpliedVolatility(marketPrice as number, {
      underlyingPrice: underlyingPrice as number,
      strikePrice: strikePrice as number,
      timeToExpiration: timeToExpiration as number,
      riskFreeRate: riskFreeRate as number,
      optionType: optionType as 'call' | 'put'
    });

    res.json({
      impliedVolatility,
      annualizedPercent: Math.round(impliedVolatility * 100 * 100) / 100,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to calculate implied volatility:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;