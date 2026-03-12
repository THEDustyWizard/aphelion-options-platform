import { Router } from 'express';

const router = Router();

// Admin routes - stub implementation
router.get('/status', (_req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString() });
});

export default router;
