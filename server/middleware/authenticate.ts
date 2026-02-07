import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './authorize';

// Simple session-based authentication
// In production, use proper JWT tokens or session management
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // For development, use a simple header-based auth
    // In production, implement proper JWT or session management
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      // If no user ID in header, default to user 1 for backward compatibility
      // This allows the app to work without authentication during development
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        req.user = {
          id: defaultUser.id,
          email: defaultUser.email,
          name: defaultUser.name,
        };
      }
      return next();
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to require authentication
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
