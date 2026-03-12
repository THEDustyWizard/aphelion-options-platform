"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Admin routes - stub implementation
router.get('/status', (_req, res) => {
    res.json({ status: 'operational', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map