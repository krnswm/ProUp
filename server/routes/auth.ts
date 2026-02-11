import { RequestHandler } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
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

export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpiresAt: expiresAt,
        },
      });

      const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:8080';
      const resetLink = `${appBaseUrl}/reset-password/${token}`;

      const gmailUser = process.env.GMAIL_USER;
      const gmailPassword = process.env.GMAIL_PASSWORD;

      if (!gmailUser || !gmailPassword) {
        console.log('====================================');
        console.log('📧 MOCK PASSWORD RESET EMAIL (Gmail not configured)');
        console.log('====================================');
        console.log(`To: ${email}`);
        console.log('Subject: Reset your password');
        console.log(`Reset link: ${resetLink}`);
        console.log('====================================');
      } else {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: gmailUser, pass: gmailPassword },
        });

        await transporter.sendMail({
          from: gmailUser,
          to: email,
          subject: 'Reset your password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Reset your password</h2>
              <p style="color: #666; font-size: 14px;">Hi ${user.name},</p>
              <p style="color: #666; font-size: 14px;">Click the button below to reset your password. This link will expire in 1 hour.</p>
              <p style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
              </p>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <code style="background-color: #f5f5f5; padding: 10px; display: inline-block; margin-top: 10px;">${resetLink}</code>
            </div>
          `,
        });
      }
    }

    res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
};

export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
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
