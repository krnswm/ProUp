import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

// Extend Express Request to include user info
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

// Role hierarchy: Admin > Member > Viewer
const roleHierarchy: { [key: string]: number } = {
  Admin: 3,
  Member: 2,
  Viewer: 1,
};

// Permission mapping for different actions
const permissions: { [key: string]: string[] } = {
  // Project permissions
  'project:delete': ['Admin'],
  'project:edit': ['Admin', 'Member'],
  'project:view': ['Admin', 'Member', 'Viewer'],
  'project:invite': ['Admin'],
  'project:removeMember': ['Admin'],
  
  // Task permissions
  'task:create': ['Admin', 'Member'],
  'task:edit': ['Admin', 'Member'],
  'task:delete': ['Admin', 'Member'],
  'task:view': ['Admin', 'Member', 'Viewer'],
};

/**
 * Middleware to check if user has permission for a specific action on a project
 * Usage: authorize('project:delete')
 */
export const authorize = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Get user from request (assumes authentication middleware has already run)
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get project ID from params
      const projectId = parseInt(req.params.id || req.params.projectId || '0');
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Check if user is the project owner
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Owner has all permissions
      if (project.ownerId === userId) {
        return next();
      }

      // Check if user is a member and get their role
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        select: { role: true },
      });

      if (!membership) {
        return res.status(403).json({ 
          error: 'You do not have access to this project',
          message: 'You must be a project member to perform this action'
        });
      }

      // Check if the user's role has the required permission
      const allowedRoles = permissions[requiredPermission];
      if (!allowedRoles) {
        return res.status(500).json({ error: 'Invalid permission specified' });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          yourRole: membership.role,
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Middleware to check if user has at least a minimum role level
 * Usage: requireRole('Member')
 */
export const requireRole = (minRole: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const projectId = parseInt(req.params.id || req.params.projectId || '0');
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Check if user is the project owner
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Owner is treated as Admin
      if (project.ownerId === userId) {
        return next();
      }

      // Get user's role in the project
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        select: { role: true },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check role hierarchy
      const userRoleLevel = roleHierarchy[membership.role] || 0;
      const requiredRoleLevel = roleHierarchy[minRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires at least ${minRole} role`,
          yourRole: membership.role,
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};

/**
 * Helper function to get user's role in a project
 */
export const getUserRole = async (
  userId: number,
  projectId: number
): Promise<string | null> => {
  try {
    // Check if user is owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userId) {
      return 'Owner';
    }

    // Check membership
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { role: true },
    });

    return membership?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Helper function to check if user has access to a project
 */
export const hasProjectAccess = async (
  userId: number,
  projectId: number
): Promise<boolean> => {
  try {
    const role = await getUserRole(userId, projectId);
    return role !== null;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
};
