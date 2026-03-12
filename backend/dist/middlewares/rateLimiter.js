"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.resetRateLimit = exports.getRateLimitInfo = exports.endpointRateLimitMiddleware = exports.userRateLimitMiddleware = exports.rateLimitMiddleware = exports.initializeRateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('RateLimiter');
// Create rate limiter instance
let rateLimiter = null;
/**
 * Initialize rate limiter
 */
const initializeRateLimiter = async () => {
    try {
        const redisClient = redis_1.RedisConfig.getClient();
        rateLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rate_limit',
            points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Number of requests
            duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Window in seconds (15 minutes default)
            blockDuration: 60, // Block for 60 seconds after exceeding limit
        });
        logger.info('Rate limiter initialized');
    }
    catch (error) {
        logger.error('Failed to initialize rate limiter:', error);
        // Fallback to in-memory limiter if Redis fails
        rateLimiter = null;
    }
};
exports.initializeRateLimiter = initializeRateLimiter;
/**
 * Rate limiting middleware
 */
const rateLimitMiddleware = async (req, res, next) => {
    // Skip rate limiting for health checks and in development
    if (req.path === '/health' || process.env.NODE_ENV === 'development') {
        return next();
    }
    // If rate limiter not initialized, skip rate limiting
    if (!rateLimiter) {
        return next();
    }
    try {
        // Use IP address as key
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        await rateLimiter.consume(key);
        next();
    }
    catch (error) {
        if (error && typeof error === 'object' && 'msBeforeNext' in error) {
            logger.warn(`Rate limit exceeded for ${req.ip}`, {
                ip: req.ip,
                path: req.path,
                userAgent: req.get('user-agent')
            });
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(error.msBeforeNext / 1000),
                timestamp: new Date().toISOString()
            });
        }
        else {
            // Redis error or other issue
            logger.error('Rate limiter error:', error);
            next(); // Allow request if rate limiter fails
        }
    }
};
exports.rateLimitMiddleware = rateLimitMiddleware;
/**
 * Per-user rate limiting middleware
 */
const userRateLimitMiddleware = async (req, res, next) => {
    // Skip for health checks
    if (req.path === '/health') {
        return next();
    }
    // If rate limiter not initialized, skip
    if (!rateLimiter) {
        return next();
    }
    try {
        // Use user ID if authenticated, otherwise use IP
        const userId = req.user?.id;
        const key = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;
        await rateLimiter.consume(key);
        next();
    }
    catch (error) {
        if (error && typeof error === 'object' && 'msBeforeNext' in error) {
            const userId = req.user?.id;
            logger.warn(`User rate limit exceeded`, {
                userId,
                ip: req.ip,
                path: req.path
            });
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(error.msBeforeNext / 1000),
                timestamp: new Date().toISOString()
            });
        }
        else {
            logger.error('User rate limiter error:', error);
            next();
        }
    }
};
exports.userRateLimitMiddleware = userRateLimitMiddleware;
/**
 * Endpoint-specific rate limiting
 */
const endpointRateLimitMiddleware = (points, durationSeconds) => {
    return async (req, res, next) => {
        if (!rateLimiter) {
            return next();
        }
        try {
            const key = `endpoint:${req.path}:${req.ip || 'unknown'}`;
            // Create endpoint-specific limiter
            const endpointLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
                storeClient: redis_1.RedisConfig.getClient(),
                keyPrefix: `endpoint_limit:${req.path}`,
                points,
                duration: durationSeconds,
                blockDuration: durationSeconds * 2,
            });
            await endpointLimiter.consume(key);
            next();
        }
        catch (error) {
            if (error && typeof error === 'object' && 'msBeforeNext' in error) {
                logger.warn(`Endpoint rate limit exceeded for ${req.path}`, {
                    ip: req.ip,
                    path: req.path
                });
                res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded for this endpoint. Please try again in ${Math.ceil(error.msBeforeNext / 1000)} seconds.`,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                logger.error('Endpoint rate limiter error:', error);
                next();
            }
        }
    };
};
exports.endpointRateLimitMiddleware = endpointRateLimitMiddleware;
/**
 * Get rate limit info for a key
 */
const getRateLimitInfo = async (key) => {
    if (!rateLimiter) {
        return null;
    }
    try {
        const res = await rateLimiter.get(key);
        if (res) {
            return {
                remaining: res.remainingPoints,
                reset: Math.ceil(res.msBeforeNext / 1000),
                total: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
            };
        }
        return {
            remaining: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
            reset: 0,
            total: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
        };
    }
    catch (error) {
        logger.error('Failed to get rate limit info:', error);
        return null;
    }
};
exports.getRateLimitInfo = getRateLimitInfo;
/**
 * Reset rate limit for a key
 */
const resetRateLimit = async (key) => {
    if (!rateLimiter) {
        return false;
    }
    try {
        await rateLimiter.delete(key);
        logger.info(`Rate limit reset for key: ${key}`);
        return true;
    }
    catch (error) {
        logger.error('Failed to reset rate limit:', error);
        return false;
    }
};
exports.resetRateLimit = resetRateLimit;
// Export middleware for default use
exports.default = {
    middleware: exports.rateLimitMiddleware,
    userMiddleware: exports.userRateLimitMiddleware,
    endpointMiddleware: exports.endpointRateLimitMiddleware,
    initialize: exports.initializeRateLimiter,
    getInfo: exports.getRateLimitInfo,
    reset: exports.resetRateLimit
};
/**
 * RateLimiter class for named import compatibility
 */
class RateLimiter {
    static middleware() {
        return exports.rateLimitMiddleware;
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map