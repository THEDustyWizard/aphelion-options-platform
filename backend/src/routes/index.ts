import { Router } from 'express';
import authRoutes from './auth.routes';
import marketDataRoutes from './marketData.routes';
import recommendationRoutes from './recommendation.routes';
import newsRoutes from './news.routes';
import portfolioRoutes from './portfolio.routes';
import calculationRoutes from './calculation.routes';
import adminRoutes from './admin.routes';

export function registerRoutes(): Router {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'APHELION Backend API'
    });
  });

  // API routes
  router.use('/auth', authRoutes);
  router.use('/market', marketDataRoutes);
  router.use('/recommendations', recommendationRoutes);
  router.use('/news', newsRoutes);
  router.use('/portfolio', portfolioRoutes);
  router.use('/calculation', calculationRoutes);
  
  // Admin routes (protected)
  if (process.env.NODE_ENV !== 'production') {
    router.use('/admin', adminRoutes);
  }

  return router;
}