"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
exports.default = router;
//# sourceMappingURL=auth.routes.js.map