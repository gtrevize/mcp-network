/**
 * JWT Authentication Middleware for REST API
 * Validates AUTH_TOKEN header and adds user context to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken, AuthTokenPayload, ROLE_PERMISSIONS } from '../../auth/jwt.js';
import { logger } from '../../logger/index.js';

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        roles: string[];
        permissions: string[];
        token: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Expects: Authorization: Bearer <token> header
 * Or: AUTH_TOKEN header
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header or AUTH_TOKEN header
    const authHeader = req.headers.authorization;
    const authTokenHeader = req.headers['auth-token'] || req.headers['AUTH-TOKEN'];

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof authTokenHeader === 'string') {
      token = authTokenHeader;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Provide token via "Authorization: Bearer <token>" or "AUTH-TOKEN: <token>" header.',
      });
      return;
    }

    // Verify token
    const payload: AuthTokenPayload | null = verifyAuthToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token',
      });
      return;
    }

    // Add auth context to request
    req.auth = {
      userId: payload.userId,
      roles: payload.roles,
      permissions: payload.roles.flatMap(role => ROLE_PERMISSIONS[role] || []),
      token,
    };

    logger.debug({
      userId: payload.userId,
      roles: payload.roles,
      path: req.path,
    }, 'Request authenticated');

    next();
  } catch (error) {
    logger.error({ error }, 'Authentication middleware error');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Permission check middleware factory
 * Usage: checkPermission('network:ping')
 */
export function checkPermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Admin role bypasses permission check
    if (req.auth.roles.includes('admin')) {
      next();
      return;
    }

    // Check if user has required permission
    if (!req.auth.permissions.includes(requiredPermission)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Insufficient permissions. Required: ${requiredPermission}`,
        userPermissions: req.auth.permissions,
      });
      return;
    }

    next();
  };
}
