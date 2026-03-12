"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Portfolio routes - stub implementation
router.get('/', (_req, res) => {
    res.status(501).json({ error: 'Not Implemented', message: 'Portfolio endpoint coming soon', timestamp: new Date().toISOString() });
});
router.get('/positions', (_req, res) => {
    res.status(501).json({ error: 'Not Implemented', message: 'Portfolio endpoint coming soon', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=portfolio.routes.js.map