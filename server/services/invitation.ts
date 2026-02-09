import { prisma } from '../prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generate a unique invitation token
 */
export const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a new invitation
 */
export const createInvitation = async (
  email: string,
  projectId: number,
  role: string,
  invitedBy: number
) => {
  try {
    // Check if there's already a pending invitation for this email and project
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        projectId,
        status: 'pending',
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // If invitation already exists, return it so user can resend/share the link
    if (existingInvitation) {
      return existingInvitation;
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMembership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        throw new Error('This user is already a member of the project');
      }
    }

    // Generate unique token
    const token = generateInvitationToken();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        projectId,
        role,
        token,
        invitedBy,
        expiresAt,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return invitation;
  } catch (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }
};

/**
 * Accept an invitation and add user to project
 */
export const acceptInvitation = async (token: string, userId: number) => {
  try {
    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        project: true,
      },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      throw new Error('This invitation has already been used');
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new Error('This invitation has expired');
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user email matches invitation email
    if (user.email !== invitation.email) {
      throw new Error('This invitation was sent to a different email address');
    }

    // Check if user is already a member
    const existingMembership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invitation.projectId,
          userId: userId,
        },
      },
    });

    if (existingMembership) {
      throw new Error('You are already a member of this project');
    }

    // Add user to project with the specified role
    const membership = await prisma.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId: userId,
        role: invitation.role,
      },
    });

    // Update invitation status to accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return {
      membership,
      project: invitation.project,
    };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Get all invitations for a project
 */
export const getProjectInvitations = async (projectId: number) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        projectId,
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations;
  } catch (error) {
    console.error('Error fetching project invitations:', error);
    throw error;
  }
};

/**
 * Get all invitations for a user (by email)
 */
export const getUserInvitations = async (email: string) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        email,
        status: 'pending',
        expiresAt: {
          gt: new Date(), // Only get non-expired invitations
        },
      },
      include: {
        project: {
          select: {
            name: true,
            description: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations;
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    throw error;
  }
};

/**
 * Cancel/revoke an invitation
 */
export const cancelInvitation = async (invitationId: number) => {
  try {
    const invitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'expired' },
    });

    return invitation;
  } catch (error) {
    console.error('Error canceling invitation:', error);
    throw error;
  }
};

/**
 * Send invitation email via Gmail SMTP
 */
export const sendInvitationEmail = async (
  invitation: {
    email: string;
    token: string;
    project: { name: string };
    inviter: { name: string };
  }
) => {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.error('Gmail credentials not configured in environment variables');
      console.log('====================================');
      console.log('📧 MOCK EMAIL SENT (Gmail not configured)');
      console.log('====================================');
      console.log(`To: ${invitation.email}`);
      console.log(`Subject: You've been invited to join ${invitation.project.name}`);
      console.log(`Join link: http://localhost:8080/join-project/${invitation.token}`);
      console.log('====================================');
      return false;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Email template
    const invitationLink = `http://localhost:8080/join-project/${invitation.token}`;
    
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You've been invited to join a project!</h2>
        
        <p style="color: #666; font-size: 14px;">Hi there,</p>
        
        <p style="color: #666; font-size: 14px;">
          <strong>${invitation.inviter.name}</strong> has invited you to collaborate on the project <strong>"${invitation.project.name}"</strong>.
        </p>
        
        <p style="margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br>
          <code style="background-color: #f5f5f5; padding: 10px; display: inline-block; margin-top: 10px;">${invitationLink}</code>
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This invitation will expire in 7 days.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    // Send email
    const mailOptions = {
      from: gmailUser,
      to: invitation.email,
      subject: `You've been invited to join ${invitation.project.name}`,
      html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);

    console.log('====================================');
    console.log('📧 EMAIL SENT SUCCESSFULLY');
    console.log('====================================');
    console.log(`To: ${invitation.email}`);
    console.log(`Subject: You've been invited to join ${invitation.project.name}`);
    console.log(`From: ${gmailUser}`);
    console.log('====================================');

    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    // Don't throw - allow the invitation to be created even if email fails
    return false;
  }
};
