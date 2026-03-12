import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Role-based authorization middleware
 */
export declare const roleMiddleware: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * API key authentication middleware (for external services)
 */
export declare const apiKeyMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map