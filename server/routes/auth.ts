import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register: RequestHandler = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // In production, hash the password before storing
    // For now, storing plain text for development
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password, // TODO: Hash password in production
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return user info
 */
export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // In production, compare hashed passwords
    // For now, simple comparison for development
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user info (in production, also return JWT token)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export const getCurrentUser: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full user details
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

/**
 * POST /api/auth/logout
 * Logout current user
 */
export const logout: RequestHandler = async (_req, res) => {
  // In a real implementation, this would invalidate the session/token
  // For now, just return success
  res.json({ message: 'Logged out successfully' });
};

/**
 * GET /api/auth/users
 * Get all users (for development/admin purposes)
 */
export const getAllUsers: RequestHandler = async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};
