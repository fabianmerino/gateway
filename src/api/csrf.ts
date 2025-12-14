import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

const CSRF_SECRET = process.env.CSRF_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET environment variable must be set in production');
  }
  return 'csrf-secret-change-in-production';
})();
const CSRF_COOKIE_NAME = 'csrf_token';

// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to set CSRF token in cookie
export function csrfCookieMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if CSRF token cookie exists
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  next();
}

// Middleware to verify CSRF token
export function verifyCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'] as string;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
    });
    return;
  }

  next();
}

// Export cookie parser for use in main server
export { cookieParser };
