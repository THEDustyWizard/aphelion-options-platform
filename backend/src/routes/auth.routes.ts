import { Router } from 'express';

const router = Router();

// Authentication routes - stub implementation
router.post('/login', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Auth endpoint coming soon', timestamp: new Date().toISOString() });
});

router.post('/register', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Auth endpoint coming soon', timestamp: new Date().toISOString() });
});

router.post('/refresh', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Auth endpoint coming soon', timestamp: new Date().toISOString() });
});

router.post('/logout', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Auth endpoint coming soon', timestamp: new Date().toISOString() });
});

export default router;
