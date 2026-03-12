import { Router } from 'express';

const router = Router();

// Portfolio routes - stub implementation
router.get('/', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Portfolio endpoint coming soon', timestamp: new Date().toISOString() });
});

router.get('/positions', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Portfolio endpoint coming soon', timestamp: new Date().toISOString() });
});

export default router;
