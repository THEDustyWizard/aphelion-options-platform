import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RedisConfig } from '../config/redis';
import { Logger } from '../utils/logger';

const logger = new Logger('RateLimiter');

// Create rate limiter instance
let rateLimiter: RateLimiterRedis | null = null;

/**
 * Initialize rate limiter
 */
export const initializeRateLimiter = async (): Promise<void> => {
  try {
    const redisClient = RedisConfig.getClient();
    
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Number of requests
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Window in seconds (15 minutes default)
      blockDuration: 60, // Block for 60 seconds after exceeding limit
    });
    
    logger.info('Rate limiter initialized');
  } catch (error) {
    logger.error('Failed to initialize rate limiter:', error);
    // Fallback to in-memory limiter if Redis fails
    rateLimiter = null;
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  } catch (error: any) {
    if (error && typeof error === 'object' && 'msBeforeNext' in error) {
      logger.warn(`Rate limit exceeded for ${req.ip}`, {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('user-agent')
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((error as any).msBeforeNext / 1000),
        timestamp: new Date().toISOString()
      });
    } else {
      // Redis error or other issue
      logger.error('Rate limiter error:', error);
      next(); // Allow request if rate limiter fails
    }
  }
};

/**
 * Per-user rate limiting middleware
 */
export const userRateLimitMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    const userId = (req as any).user?.id;
    const key = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;
    
    await rateLimiter.consume(key);
    next();
  } catch (error: any) {
    if (error && typeof error === 'object' && 'msBeforeNext' in error) {
      const userId = (req as any).user?.id;
      logger.warn(`User rate limit exceeded`, {
        userId,
        ip: req.ip,
        path: req.path
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((error as any).msBeforeNext / 1000),
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('User rate limiter error:', error);
      next();
    }
  }
};

/**
 * Endpoint-specific rate limiting
 */
export const endpointRateLimitMiddleware = (points: number, durationSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!rateLimiter) {
      return next();
    }

    try {
      const key = `endpoint:${req.path}:${req.ip || 'unknown'}`;
      
      // Create endpoint-specific limiter
      const endpointLimiter = new RateLimiterRedis({
        storeClient: RedisConfig.getClient(),
        keyPrefix: `endpoint_limit:${req.path}`,
        points,
        duration: durationSeconds,
        blockDuration: durationSeconds * 2,
      });
      
      await endpointLimiter.consume(key);
      next();
    } catch (error: any) {
      if (error && typeof error === 'object' && 'msBeforeNext' in error) {
        logger.warn(`Endpoint rate limit exceeded for ${req.path}`, {
          ip: req.ip,
          path: req.path
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for this endpoint. Please try again in ${Math.ceil((error as any).msBeforeNext / 1000)} seconds.`,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error('Endpoint rate limiter error:', error);
        next();
      }
    }
  };
};

/**
 * Get rate limit info for a key
 */
export const getRateLimitInfo = async (key: string): Promise<{
  remaining: number;
  reset: number;
  total: number;
} | null> => {
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
  } catch (error) {
    logger.error('Failed to get rate limit info:', error);
    return null;
  }
};

/**
 * Reset rate limit for a key
 */
export const resetRateLimit = async (key: string): Promise<boolean> => {
  if (!rateLimiter) {
    return false;
  }

  try {
    await rateLimiter.delete(key);
    logger.info(`Rate limit reset for key: ${key}`);
    return true;
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
    return false;
  }
};

// Export middleware for default use
export default {
  middleware: rateLimitMiddleware,
  userMiddleware: userRateLimitMiddleware,
  endpointMiddleware: endpointRateLimitMiddleware,
  initialize: initializeRateLimiter,
  getInfo: getRateLimitInfo,
  reset: resetRateLimit
};

/**
 * RateLimiter class for named import compatibility
 */
export class RateLimiter {
  public static middleware() {
    return rateLimitMiddleware;
  }
}