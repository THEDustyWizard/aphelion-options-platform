import { Router, Request, Response } from 'express';
import { NewsService } from '../services/news.service';
import { Logger } from '../utils/logger';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimiter';

const router = Router();
const logger = new Logger('NewsRoutes');
const newsService = new NewsService();

router.get('/ticker/:symbol', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const articles = await newsService.getNewsForTicker(symbol, limit);
    res.json({ symbol, count: articles.length, articles });
  } catch (error: any) {
    logger.error('Failed to get news for ticker:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, timestamp: new Date().toISOString() });
  }
});

router.get('/sector/:sector', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { sector } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const articles = await newsService.getNewsForSector(sector, limit);
    res.json({ sector, count: articles.length, articles });
  } catch (error: any) {
    logger.error('Failed to get news for sector:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, timestamp: new Date().toISOString() });
  }
});

export default router;
