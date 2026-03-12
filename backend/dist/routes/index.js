"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const marketData_routes_1 = __importDefault(require("./marketData.routes"));
const recommendation_routes_1 = __importDefault(require("./recommendation.routes"));
const news_routes_1 = __importDefault(require("./news.routes"));
const portfolio_routes_1 = __importDefault(require("./portfolio.routes"));
const calculation_routes_1 = __importDefault(require("./calculation.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
function registerRoutes() {
    const router = (0, express_1.Router)();
    // Health check
    router.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'APHELION Backend API'
        });
    });
    // API routes
    router.use('/auth', auth_routes_1.default);
    router.use('/market', marketData_routes_1.default);
    router.use('/recommendations', recommendation_routes_1.default);
    router.use('/news', news_routes_1.default);
    router.use('/portfolio', portfolio_routes_1.default);
    router.use('/calculation', calculation_routes_1.default);
    // Admin routes (protected)
    if (process.env.NODE_ENV !== 'production') {
        router.use('/admin', admin_routes_1.default);
    }
    return router;
}
//# sourceMappingURL=index.js.map