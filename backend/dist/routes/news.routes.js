"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const news_service_1 = require("../services/news.service");
const logger_1 = require("../utils/logger");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
const logger = new logger_1.Logger('NewsRoutes');
const newsService = new news_service_1.NewsService();
router.get('/ticker/:symbol', auth_middleware_1.authMiddleware, rateLimiter_1.rateLimitMiddleware, async (req, res) => {
    try {
        const { symbol } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const articles = await newsService.getNewsForTicker(symbol, limit);
        res.json({ symbol, count: articles.length, articles });
    }
    catch (error) {
        logger.error('Failed to get news for ticker:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, timestamp: new Date().toISOString() });
    }
});
router.get('/sector/:sector', auth_middleware_1.authMiddleware, rateLimiter_1.rateLimitMiddleware, async (req, res) => {
    try {
        const { sector } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const articles = await newsService.getNewsForSector(sector, limit);
        res.json({ sector, count: articles.length, articles });
    }
    catch (error) {
        logger.error('Failed to get news for sector:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, timestamp: new Date().toISOString() });
    }
});
exports.default = router;
//# sourceMappingURL=news.routes.js.map