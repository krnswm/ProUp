import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from 'http';
import { authenticate } from "./middleware/authenticate";
import { getTasks, getMyTasks, getProjectBoard, reorderTasks, getTask, createTask, updateTask, deleteTask } from "./routes/tasks";
import { getActivityLogs } from "./routes/activityLogs";
import { getCalendarTasks, getFilteredCalendarTasks } from "./routes/calendar";
import { getNotifications, getUnreadCount, markAllRead, markNotificationRead } from "./routes/notifications";
import { createTaskComment, deleteTaskComment, getTaskComments, updateTaskComment } from "./routes/comments";
import { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectMembers,
  updateMemberRole,
  removeMember,
  inviteMember,
  getProjectInvitations,
  joinProject,
  cancelInvitation,
} from "./routes/projects";
import { getDashboardAnalytics } from "./routes/dashboard";
import { register, login, forgotPassword, resetPassword, getCurrentUser, logout, getAllUsers } from "./routes/auth";
import { getWhiteboard, saveWhiteboard } from "./routes/whiteboard";
import { getDocuments, getDocument, createDocument, updateDocument, deleteDocument } from "./routes/documents";
import { setupSocketServer } from "./socket";
import { getProjectTemplates } from "./routes/projectTemplates";
import { addTaskDependency, getTaskDependencies, removeTaskDependency } from "./routes/taskDependencies";
import { getProjectLeaderboard } from "./routes/leaderboard";
import { getProjectLabels, createLabel, updateLabel, deleteLabel, addLabelToTask, removeLabelFromTask, getTaskLabels } from "./routes/labels";
import { getTaskAttachments, uploadAttachment, downloadAttachment, deleteAttachment } from "./routes/attachments";
import { getTaskReactions, toggleReaction, updateTaskCover } from "./routes/reactions";
import { getChatMessages, postChatMessage } from "./routes/chat";
import {
  listIntegrations,
  disconnectIntegration,
  googleAuth,
  googleCallback,
  googleDriveFiles,
  githubAuth,
  githubCallback,
  githubRepos,
  githubPulls,
} from "./routes/integrations";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Public routes (no authentication required)
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Auth routes (public - must be before authentication middleware)
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/forgot-password", forgotPassword);
  app.post("/api/auth/reset-password", resetPassword);
  app.get("/api/auth/users", getAllUsers);

  // OAuth callbacks (public — providers redirect here without auth headers)
  app.get("/api/integrations/google/callback", googleCallback);
  app.get("/api/integrations/github/callback", githubCallback);
  
  // Apply authentication middleware to all routes below this point
  app.use(authenticate);

  // Protected auth routes
  app.get("/api/auth/me", getCurrentUser);
  app.post("/api/auth/logout", logout);

  // Task routes
  app.get("/api/tasks", getTasks);
  app.get("/api/tasks/my", getMyTasks);
  app.get("/api/tasks/:id", getTask);
  app.post("/api/tasks", createTask);
  app.patch("/api/tasks/reorder", reorderTasks);
  app.put("/api/tasks/:id", updateTask);
  app.delete("/api/tasks/:id", deleteTask);

  // Project board routes
  app.get("/api/projects/:projectId/board", getProjectBoard);

  // Activity log routes
  app.get("/api/tasks/:taskId/activity-logs", getActivityLogs);

  // Comments routes
  app.get("/api/tasks/:taskId/comments", getTaskComments);
  app.post("/api/tasks/:taskId/comments", createTaskComment);
  app.patch("/api/tasks/:taskId/comments/:commentId", updateTaskComment);
  app.delete("/api/tasks/:taskId/comments/:commentId", deleteTaskComment);

  // Task dependency routes
  app.get("/api/tasks/:taskId/dependencies", getTaskDependencies);
  app.post("/api/tasks/:taskId/dependencies", addTaskDependency);
  app.delete("/api/tasks/:taskId/dependencies/:dependsOnTaskId", removeTaskDependency);

  // Notification routes
  app.get("/api/notifications", getNotifications);
  app.get("/api/notifications/unread-count", getUnreadCount);
  app.post("/api/notifications/:id/read", markNotificationRead);
  app.post("/api/notifications/read-all", markAllRead);

  // Calendar routes
  app.get("/api/calendar/tasks", getCalendarTasks);
  app.get("/api/calendar/tasks/filter", getFilteredCalendarTasks);

  // Dashboard routes
  app.get("/api/dashboard/analytics", getDashboardAnalytics);

  // Project routes
  app.get("/api/projects", getProjects);
  app.get("/api/projects/:id", getProject);
  app.post("/api/projects", createProject);
  app.put("/api/projects/:id", updateProject);
  app.delete("/api/projects/:id", deleteProject);
  app.get("/api/projects/:projectId/leaderboard", getProjectLeaderboard);

  // Project template routes
  app.get("/api/project-templates", getProjectTemplates);

  // Project member routes
  app.get("/api/projects/:id/members", getProjectMembers);
  app.patch("/api/projects/:id/members/:memberId", updateMemberRole);
  app.delete("/api/projects/:id/members/:memberId", removeMember);

  // Project invitation routes
  app.post("/api/projects/:id/invite", inviteMember);
  app.get("/api/projects/:id/invitations", getProjectInvitations);
  app.post("/api/projects/join/:token", joinProject);
  app.delete("/api/projects/:id/invitations/:invitationId", cancelInvitation);

  // Label routes
  app.get("/api/projects/:projectId/labels", getProjectLabels);
  app.post("/api/projects/:projectId/labels", createLabel);
  app.put("/api/projects/:projectId/labels/:labelId", updateLabel);
  app.delete("/api/projects/:projectId/labels/:labelId", deleteLabel);
  app.get("/api/tasks/:taskId/labels", getTaskLabels);
  app.post("/api/tasks/:taskId/labels", addLabelToTask);
  app.delete("/api/tasks/:taskId/labels/:labelId", removeLabelFromTask);

  // Attachment routes
  app.get("/api/tasks/:taskId/attachments", getTaskAttachments);
  app.post("/api/tasks/:taskId/attachments", uploadAttachment);
  app.get("/api/attachments/:attachmentId/download", downloadAttachment);
  app.delete("/api/attachments/:attachmentId", deleteAttachment);

  // Reaction routes
  app.get("/api/tasks/:taskId/reactions", getTaskReactions);
  app.post("/api/tasks/:taskId/reactions", toggleReaction);
  app.patch("/api/tasks/:taskId/cover", updateTaskCover);

  // Whiteboard routes
  app.get("/api/whiteboard/:projectId", getWhiteboard);
  app.post("/api/whiteboard/:projectId", saveWhiteboard);

  // Chat routes
  app.get("/api/projects/:projectId/chat", getChatMessages);
  app.post("/api/projects/:projectId/chat", postChatMessage);

  // Integration routes (protected)
  app.get("/api/integrations", listIntegrations);
  app.delete("/api/integrations/:provider", disconnectIntegration);
  app.get("/api/integrations/google/auth", googleAuth);
  app.get("/api/integrations/github/auth", githubAuth);
  app.get("/api/integrations/google/drive/files", googleDriveFiles);
  app.get("/api/integrations/github/repos", githubRepos);
  app.get("/api/integrations/github/repos/:owner/:repo/pulls", githubPulls);

  // Document routes
  app.get("/api/documents/:projectId", getDocuments);
  app.get("/api/documents/file/:documentId", getDocument);
  app.post("/api/documents", createDocument);
  app.put("/api/documents/:documentId", updateDocument);
  app.delete("/api/documents/:documentId", deleteDocument);

  return app;
}

// Create HTTP server with Socket.io support
export function createServerWithSocket() {
  const app = createServer();
  const httpServer = createHttpServer(app);
  const io = setupSocketServer(httpServer);
  
  return { app, httpServer, io };
}
