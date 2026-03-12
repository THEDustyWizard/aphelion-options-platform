import { Request, Response, NextFunction } from 'express';
/**
 * Initialize rate limiter
 */
export declare const initializeRateLimiter: () => Promise<void>;
/**
 * Rate limiting middleware
 */
export declare const rateLimitMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Per-user rate limiting middleware
 */
export declare const userRateLimitMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Endpoint-specific rate limiting
 */
export declare const endpointRateLimitMiddleware: (points: number, durationSeconds: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get rate limit info for a key
 */
export declare const getRateLimitInfo: (key: string) => Promise<{
    remaining: number;
    reset: number;
    total: number;
} | null>;
/**
 * Reset rate limit for a key
 */
export declare const resetRateLimit: (key: string) => Promise<boolean>;
declare const _default: {
    middleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    userMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    endpointMiddleware: (points: number, durationSeconds: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    initialize: () => Promise<void>;
    getInfo: (key: string) => Promise<{
        remaining: number;
        reset: number;
        total: number;
    } | null>;
    reset: (key: string) => Promise<boolean>;
};
export default _default;
/**
 * RateLimiter class for named import compatibility
 */
export declare class RateLimiter {
    static middleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=rateLimiter.d.ts.map