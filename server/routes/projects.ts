import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';
import * as invitationService from '../services/invitation';

/**
 * GET /api/projects
 * Fetches all projects where user is owner or member
 */
export const getProjects: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get projects where user is owner OR a member
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } },
        ],
      },
      include: {
        _count: {
          select: { tasks: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to include taskCount
    const projectsWithCount = projects.map((project) => ({
      ...project,
      taskCount: project._count.tasks,
    }));

    res.json(projectsWithCount);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

/**
 * GET /api/projects/:id
 * Fetches a single project with its tasks
 */
export const getProject: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const projectId = parseInt(idStr);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

/**
 * POST /api/projects
 * Creates a new project
 */
export const createProject: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { name, description, color, status, templateId } = req.body as {
      name: string;
      description?: string;
      color?: string;
      status?: string;
      templateId?: number;
    };

    const userId = req.user?.id;
    const userName = req.user?.name;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        color: color || '#3b82f6',
        status: status || 'active',
        ownerId: userId,
      },
    });

    const templateIdInt = typeof templateId === 'number' ? templateId : templateId ? parseInt(String(templateId)) : NaN;
    if (!Number.isNaN(templateIdInt)) {
      const template = await prisma.projectTemplate.findFirst({
        where: { id: templateIdInt, ownerId: userId },
        include: { tasks: { orderBy: [{ status: 'asc' }, { position: 'asc' }] } },
      });

      if (template) {
        const today = new Date();
        const asDate = (offset?: number | null) => {
          if (offset === undefined || offset === null) return null;
          const d = new Date(today);
          d.setDate(d.getDate() + offset);
          return d.toISOString().slice(0, 10);
        };

        // Set positions per status in the created tasks
        const counters: Record<string, number> = { todo: 0, inprogress: 0, done: 0 };

        await prisma.task.createMany({
          data: template.tasks.map((t) => {
            const key = String(t.status || 'todo');
            const pos = (counters[key] ?? 0);
            counters[key] = pos + 1;

            return {
              title: t.title,
              description: t.description,
              assignedUser: userName || 'Me',
              dueDate: asDate(t.dueOffsetDays),
              status: t.status,
              priority: t.priority,
              position: pos,
              projectId: project.id,
            } as any;
          }),
        });
      }
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

/**
 * PUT /api/projects/:id
 * Updates an existing project
 */
export const updateProject: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const projectId = parseInt(idStr);
    const { name, description, color, status } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        color,
        status,
      },
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

/**
 * DELETE /api/projects/:id
 * Deletes a project (tasks will have projectId set to null)
 */
export const deleteProject: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const projectId = parseInt(idStr);

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/projects/:id/members
 * Get all members of a project
 */
export const getProjectMembers: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const idValue = Array.isArray(id) ? id[0] : id;
    const projectId = parseInt(idValue);

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    // Also get the project owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Include owner in the members list
    const allMembers = [
      {
        id: 0, // Special ID for owner
        projectId,
        userId: project.owner.id,
        role: 'Owner',
        joinedAt: project.createdAt,
        user: project.owner,
      },
      ...members,
    ];

    res.json(allMembers);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
};

/**
 * PATCH /api/projects/:id/members/:memberId
 * Update a member's role
 */
export const updateMemberRole: RequestHandler = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const memberIdValue = Array.isArray(memberId) ? memberId[0] : memberId;
    const memberIdInt = parseInt(memberIdValue);

    if (!['Admin', 'Member', 'Viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = await prisma.projectMember.update({
      where: { id: memberIdInt },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(member);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

/**
 * DELETE /api/projects/:id/members/:memberId
 * Remove a member from a project
 */
export const removeMember: RequestHandler = async (req, res) => {
  try {
    const { memberId } = req.params;
    const memberIdValue = Array.isArray(memberId) ? memberId[0] : memberId;
    const memberIdInt = parseInt(memberIdValue);

    await prisma.projectMember.delete({
      where: { id: memberIdInt },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// ============================================
// INVITATION ROUTES
// ============================================

/**
 * POST /api/projects/:id/invite
 * Send an invitation to join a project
 */
export const inviteMember: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const idValue = Array.isArray(id) ? id[0] : id;
    const projectId = parseInt(idValue);
    const { email, role } = req.body;
    const userId = req.user?.id || 1; // Fallback to user 1 for now

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['Admin', 'Member', 'Viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create invitation
    const invitation = await invitationService.createInvitation(
      email,
      projectId,
      role,
      userId
    );

    // Send invitation email
    await invitationService.sendInvitationEmail(invitation);

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        token: invitation.token,
      },
    });
  } catch (error: any) {
    console.error('Error inviting member:', error);
    res.status(500).json({ 
      error: 'Failed to send invitation',
      message: error.message 
    });
  }
};

/**
 * GET /api/projects/:id/invitations
 * Get all pending invitations for a project
 */
export const getProjectInvitations: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const idValue = Array.isArray(id) ? id[0] : id;
    const projectId = parseInt(idValue);

    const invitations = await invitationService.getProjectInvitations(projectId);

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

/**
 * POST /api/projects/join/:token
 * Accept an invitation and join a project
 */
export const joinProject: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id || 1; // Fallback to user 1 for now

    const tokenValue = Array.isArray(token) ? token[0] : token;
    const result = await invitationService.acceptInvitation(tokenValue, userId);

    res.json({
      message: 'Successfully joined project',
      project: result.project,
      membership: result.membership,
    });
  } catch (error: any) {
    console.error('Error joining project:', error);
    res.status(400).json({ 
      error: 'Failed to join project',
      message: error.message 
    });
  }
};

/**
 * DELETE /api/projects/:id/invitations/:invitationId
 * Cancel/revoke an invitation
 */
export const cancelInvitation: RequestHandler = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const invitationIdValue = Array.isArray(invitationId) ? invitationId[0] : invitationId;
    const invitationIdInt = parseInt(invitationIdValue);

    await invitationService.cancelInvitation(invitationIdInt);

    res.status(204).send();
  } catch (error) {
    console.error('Error canceling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
};
