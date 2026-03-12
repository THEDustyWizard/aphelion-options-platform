import { Router, Request, Response } from 'express';
import { SchwabService } from '../services/schwab.service';
import { Logger } from '../utils/logger';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimiter';

const router = Router();
const logger = new Logger('MarketDataRoutes');
const schwabService = new SchwabService();

/**
 * @swagger
 * /market/quotes/{symbol}:
 *   get:
 *     summary: Get quote for a symbol
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *     responses:
 *       200:
 *         description: Quote data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/quotes/:symbol', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const quote = await schwabService.getQuote(symbol);
    
    if (!quote) {
      return void res.status(404).json({
        error: 'Not Found',
        message: `Quote not found for symbol ${symbol}`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(quote);
  } catch (error: any) {
    logger.error(`Failed to get quote for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/option-chains/{symbol}:
 *   get:
 *     summary: Get option chain for a symbol
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *       - in: query
 *         name: expiration
 *         schema:
 *           type: string
 *           format: date
 *         description: Expiration date (YYYY-MM-DD)
 *       - in: query
 *         name: strikeCount
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of strikes to return
 *     responses:
 *       200:
 *         description: Option chain data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/option-chains/:symbol', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { expiration, strikeCount } = req.query;
    
    const params: any = {};
    if (expiration) params.expiration = expiration;
    if (strikeCount) params.strikeCount = parseInt(strikeCount as string);
    
    const chain = await schwabService.getOptionChain(symbol, params);
    res.json(chain);
  } catch (error: any) {
    logger.error(`Failed to get option chain for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/historical/{symbol}:
 *   get:
 *     summary: Get historical price data
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *       - in: query
 *         name: periodType
 *         schema:
 *           type: string
 *           enum: [day, month, year, ytd]
 *           default: day
 *         description: Period type
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of periods
 *       - in: query
 *         name: frequencyType
 *         schema:
 *           type: string
 *           enum: [minute, daily, weekly, monthly]
 *           default: daily
 *         description: Frequency type
 *       - in: query
 *         name: frequency
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Frequency value
 *     responses:
 *       200:
 *         description: Historical price data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/historical/:symbol', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { periodType, period, frequencyType, frequency } = req.query;
    
    const params = {
      periodType: periodType as string || 'day',
      period: parseInt(period as string) || 10,
      frequencyType: frequencyType as string || 'daily',
      frequency: parseInt(frequency as string) || 1
    };
    
    const data = await schwabService.getHistoricalPrices(symbol, params);
    res.json(data);
  } catch (error: any) {
    logger.error(`Failed to get historical data for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/search:
 *   get:
 *     summary: Search for instruments
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: projection
 *         schema:
 *           type: string
 *           enum: [symbol-search, symbol-regex, desc-search, desc-regex, fundamental]
 *           default: symbol-search
 *         description: Search projection type
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/search', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, projection } = req.query;
    
    if (!query) {
      return void res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const results = await schwabService.searchInstruments(query as string, projection as string);
    return res.json(results);
  } catch (error: any) {
    logger.error(`Failed to search instruments for query "${req.query.query}":`, error);
    return void res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/expirations/{symbol}:
 *   get:
 *     summary: Get option expiration dates for a symbol
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock symbol
 *     responses:
 *       200:
 *         description: List of expiration dates
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/expirations/:symbol', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const expirations = await schwabService.getOptionExpirations(symbol);
    res.json(expirations);
  } catch (error: any) {
    logger.error(`Failed to get expirations for ${req.params.symbol}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/unusual-activity:
 *   get:
 *     summary: Get unusual options activity
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [bullish, bearish]
 *         description: Activity direction
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *         description: Filter by symbol
 *     responses:
 *       200:
 *         description: Unusual options activity
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/unusual-activity', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { direction, symbol } = req.query;
    
    const params: any = {};
    if (direction) params.direction = direction;
    if (symbol) params.symbol = symbol;
    
    const activity = await schwabService.getUnusualActivity(params);
    res.json(activity);
  } catch (error: any) {
    logger.error('Failed to get unusual activity:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/market-hours:
 *   get:
 *     summary: Get market hours
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date (YYYY-MM-DD)
 *       - in: query
 *         name: markets
 *         schema:
 *           type: string
 *           default: equity,option
 *         description: Comma-separated list of markets
 *     responses:
 *       200:
 *         description: Market hours information
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/market-hours', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { date, markets } = req.query;
    
    const hours = await schwabService.getMarketHours(
      markets as string || 'equity,option',
      date as string || new Date().toISOString().split('T')[0]
    );
    
    res.json(hours);
  } catch (error: any) {
    logger.error('Failed to get market hours:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /market/sectors:
 *   get:
 *     summary: Get sector performance data
 *     tags: [Market Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sector performance data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/sectors', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    // Define focus sectors and their ETFs
    const sectors = [
      { name: 'Defense', symbol: 'ITA', description: 'iShares U.S. Aerospace & Defense ETF' },
      { name: 'Energy', symbol: 'XLE', description: 'Energy Select Sector SPDR Fund' },
      { name: 'Logistics', symbol: 'XLI', description: 'Industrial Select Sector SPDR Fund' },
      { name: 'Medical', symbol: 'XLV', description: 'Health Care Select Sector SPDR Fund' }
    ];
    
    // Get quotes for all sector ETFs
    const sectorPromises = sectors.map(async (sector) => {
      try {
        const quote = await schwabService.getQuote(sector.symbol);
        return {
          ...sector,
          quote: quote || null
        };
      } catch (error) {
        logger.warn(`Failed to get quote for ${sector.symbol}:`, error);
        return {
          ...sector,
          quote: null
        };
      }
    });
    
    const sectorData = await Promise.all(sectorPromises);
    
    // Calculate relative performance
    const benchmark = await schwabService.getQuote('SPY');
    const benchmarkReturn = benchmark?.regularMarketChangePercent || 0;
    
    const sectorsWithPerformance = sectorData.map(sector => {
      const sectorReturn = sector.quote?.regularMarketChangePercent || 0;
      const relativePerformance = sectorReturn - benchmarkReturn;
      
      return {
        ...sector,
        performance: {
          dailyReturn: sectorReturn,
          relativeToSPY: relativePerformance,
          outperforming: relativePerformance > 0
        }
      };
    });
    
    res.json({
      sectors: sectorsWithPerformance,
      benchmark: {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        dailyReturn: benchmarkReturn
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get sector performance:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;