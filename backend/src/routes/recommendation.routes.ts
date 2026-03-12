import { Router, Request, Response } from 'express';
import { RecommendationService, RecommendationRequest } from '../services/recommendation.service';
import { Logger } from '../utils/logger';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimiter';
import { validateRequest } from '../middlewares/validation.middleware';
import Joi from 'joi';

const router = Router();
const logger = new Logger('RecommendationRoutes');
const recommendationService = new RecommendationService();

// Validation schemas
const generateRecommendationSchema = Joi.object({
  ticker: Joi.string().required().max(10),
  sector: Joi.string().valid('defense', 'energy', 'logistics', 'medical').required(),
  lookbackDays: Joi.number().integer().min(1).max(365).default(60),
  includeOptionsAnalysis: Joi.boolean().default(true),
  includeNewsSentiment: Joi.boolean().default(true)
});

const batchRecommendationSchema = Joi.object({
  requests: Joi.array().items(generateRecommendationSchema).min(1).max(20).required(),
  maxConcurrent: Joi.number().integer().min(1).max(10).default(5)
});

/**
 * @swagger
 * /recommendations/generate:
 *   post:
 *     summary: Generate a recommendation for a single ticker
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticker
 *               - sector
 *             properties:
 *               ticker:
 *                 type: string
 *                 description: Stock symbol
 *               sector:
 *                 type: string
 *                 enum: [defense, energy, logistics, medical]
 *                 description: Sector classification
 *               lookbackDays:
 *                 type: integer
 *                 default: 60
 *                 description: Days to look back for analysis
 *               includeOptionsAnalysis:
 *                 type: boolean
 *                 default: true
 *               includeNewsSentiment:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Recommendation generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Recommendation'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/generate',
  authMiddleware,
  rateLimitMiddleware,
  validateRequest(generateRecommendationSchema),
  async (req: Request, res: Response) => {
    try {
      const request: RecommendationRequest = req.body;
      const recommendation = await recommendationService.generateRecommendation(request);
      
      res.json(recommendation);
    } catch (error: any) {
      logger.error('Failed to generate recommendation:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /recommendations/generate-batch:
 *   post:
 *     summary: Generate recommendations for multiple tickers
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requests
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RecommendationRequest'
 *                 description: Array of recommendation requests
 *               maxConcurrent:
 *                 type: integer
 *                 default: 5
 *                 description: Maximum concurrent requests
 *     responses:
 *       200:
 *         description: Batch recommendations generated
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recommendation'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/generate-batch',
  authMiddleware,
  rateLimitMiddleware,
  validateRequest(batchRecommendationSchema),
  async (req: Request, res: Response) => {
    try {
      const { requests, maxConcurrent } = req.body;
      const recommendations = await recommendationService.generateBatchRecommendations(requests, maxConcurrent);
      
      res.json({
        count: recommendations.length,
        recommendations,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to generate batch recommendations:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /recommendations/recent/{ticker}:
 *   get:
 *     summary: Get recent recommendations for a ticker
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of recommendations to return
 *     responses:
 *       200:
 *         description: List of recent recommendations
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/recent/:ticker', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const recommendations = await recommendationService.getRecentRecommendations(ticker, limit);
    
    res.json({
      ticker,
      count: recommendations.length,
      recommendations,
      retrievedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get recent recommendations for ${req.params.ticker}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /recommendations/sector/{sector}:
 *   get:
 *     summary: Get top recommendations by sector
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sector
 *         required: true
 *         schema:
 *           type: string
 *           enum: [defense, energy, logistics, medical]
 *         description: Sector name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum number of recommendations to return
 *     responses:
 *       200:
 *         description: Top recommendations for the sector
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/sector/:sector', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { sector } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!['defense', 'energy', 'logistics', 'medical'].includes(sector)) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid sector. Must be one of: defense, energy, logistics, medical',
        timestamp: new Date().toISOString()
      });
    }
    
    const recommendations = await recommendationService.getTopRecommendationsBySector(sector, limit);

    return res.json({
      sector,
      count: recommendations.length,
      recommendations,
      retrievedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get top recommendations for sector ${req.params.sector}:`, error);
    return void res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /recommendations/{id}:
 *   get:
 *     summary: Get a specific recommendation by ID
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recommendation ID
 *     responses:
 *       200:
 *         description: Recommendation details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // This would typically fetch from database
    // For now, return a placeholder
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Endpoint not yet implemented',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to get recommendation ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /recommendations/{id}/backtest:
 *   post:
 *     summary: Backtest a recommendation
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recommendation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: End date for backtest (defaults to now)
 *     responses:
 *       200:
 *         description: Backtest results
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/backtest', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;
    
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const results = await recommendationService.backtestRecommendation(id, endDateObj);
    
    return void res.json({
      recommendationId: id,
      backtest: results,
      completedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Failed to backtest recommendation ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return void res.status(404).json({
        error: 'Not Found',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return void res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /recommendations/{id}/status:
 *   patch:
 *     summary: Update recommendation status
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recommendation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               executed:
 *                 type: boolean
 *                 description: Whether the recommendation was executed
 *               executionPrice:
 *                 type: number
 *                 description: Execution price
 *               pnl:
 *                 type: number
 *                 description: Profit/loss amount
 *               pnlPercentage:
 *                 type: number
 *                 description: Profit/loss percentage
 *               active:
 *                 type: boolean
 *                 description: Whether the recommendation is still active
 *     responses:
 *       200:
 *         description: Recommendation updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch('/:id/status', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate updates
    const allowedUpdates = ['executed', 'executionPrice', 'pnl', 'pnlPercentage', 'active'];
    const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
    
    if (invalidUpdates.length > 0) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: `Invalid update fields: ${invalidUpdates.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // If marking as executed, set executedAt
    if (updates.executed === true && !updates.executedAt) {
      updates.executedAt = new Date();
    }
    
    const updatedRecommendation = await recommendationService.updateRecommendationStatus(id, updates);

    return void res.json(updatedRecommendation);
  } catch (error: any) {
    logger.error(`Failed to update recommendation ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return void res.status(404).json({
        error: 'Not Found',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return void res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /recommendations/daily:
 *   get:
 *     summary: Get daily recommendations (pre-generated)
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date (YYYY-MM-DD, defaults to today)
 *       - in: query
 *         name: sector
 *         schema:
 *           type: string
 *           enum: [defense, energy, logistics, medical, all]
 *           default: all
 *         description: Filter by sector
 *     responses:
 *       200:
 *         description: Daily recommendations
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/daily', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { date, sector } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    // This would typically fetch pre-generated daily recommendations
    // For now, return a placeholder
    return void res.status(501).json({
      error: 'Not Implemented',
      message: 'Daily recommendations endpoint not yet implemented',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get daily recommendations:', error);
    return void res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /recommendations/performance:
 *   get:
 *     summary: Get recommendation performance metrics
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *       - in: query
 *         name: sector
 *         schema:
 *           type: string
 *           enum: [defense, energy, logistics, medical, all]
 *           default: all
 *         description: Filter by sector
 *     responses:
 *       200:
 *         description: Performance metrics
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/performance', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { days, sector } = req.query;
    const daysBack = parseInt(days as string) || 30;
    
    // This would calculate performance metrics
    // For now, return a placeholder
    return void res.status(501).json({
      error: 'Not Implemented',
      message: 'Performance metrics endpoint not yet implemented',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get performance metrics:', error);
    return void res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;