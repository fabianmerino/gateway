import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthResponse, User } from '../types/api.js';
import { logWarn } from '../utils/logger/index.js';

const COMPONENT = 'Auth';

// JWT secret - in production, this must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return 'your-secret-key-change-in-production';
})();
const JWT_EXPIRES_IN = '24h';

// Default admin user - in production, this should be in a database
const defaultUsers: User[] = [
  {
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
  },
];

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as Request & { user: unknown }).user = decoded;
    next();
  } catch (error) {
    logWarn(COMPONENT, 'Invalid token', error);
    res.status(403).json({ success: false, error: 'Forbidden' });
  }
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse | null> {
  const user = defaultUsers.find((u) => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return null;
  }

  const token = jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    username: user.username,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  };
}
