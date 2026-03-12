"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyMiddleware = exports.roleMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('AuthMiddleware');
/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.warn('No authorization header provided', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No authorization token provided',
                timestamp: new Date().toISOString()
            });
            return;
        }
        // Check if token is in Bearer format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            logger.warn('Invalid authorization header format', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid authorization header format',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const token = parts[1];
        // Verify token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logger.error('JWT_SECRET not configured');
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Server configuration error',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Attach user to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role || 'user'
        };
        logger.debug(`User authenticated: ${req.user.email}`, { userId: req.user.id, path: req.path });
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('Token expired', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Token expired',
                timestamp: new Date().toISOString()
            });
        }
        else if (error.name === 'JsonWebTokenError') {
            logger.warn('Invalid token', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token',
                timestamp: new Date().toISOString()
            });
        }
        else {
            logger.error('Authentication error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Authentication failed',
                timestamp: new Date().toISOString()
            });
        }
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Role-based authorization middleware
 */
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('No user attached to request', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`User ${req.user.email} attempted to access restricted resource`, {
                userId: req.user.id,
                userRole: req.user.role,
                allowedRoles,
                path: req.path
            });
            res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions',
                timestamp: new Date().toISOString()
            });
            return;
        }
        logger.debug(`User ${req.user.email} authorized for role ${req.user.role}`, {
            userId: req.user.id,
            path: req.path
        });
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
/**
 * API key authentication middleware (for external services)
 */
const apiKeyMiddleware = (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        if (!apiKey) {
            logger.warn('No API key provided', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'API key required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        // In production, validate against database or environment variable
        const validApiKey = process.env.API_KEY;
        if (!validApiKey) {
            logger.error('API_KEY not configured');
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Server configuration error',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (apiKey !== validApiKey) {
            logger.warn('Invalid API key provided', { path: req.path });
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key',
                timestamp: new Date().toISOString()
            });
            return;
        }
        logger.debug('API key authentication successful', { path: req.path });
        next();
    }
    catch (error) {
        logger.error('API key authentication error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed',
            timestamp: new Date().toISOString()
        });
    }
};
exports.apiKeyMiddleware = apiKeyMiddleware;
//# sourceMappingURL=auth.middleware.js.map