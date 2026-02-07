import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getTasks, getTask, createTask, updateTask, deleteTask } from "./routes/tasks";
import { getActivityLogs } from "./routes/activityLogs";
import { getCalendarTasks, getFilteredCalendarTasks } from "./routes/calendar";
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

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Task routes
  app.get("/api/tasks", getTasks);
  app.get("/api/tasks/:id", getTask);
  app.post("/api/tasks", createTask);
  app.put("/api/tasks/:id", updateTask);
  app.delete("/api/tasks/:id", deleteTask);

  // Activity log routes
  app.get("/api/tasks/:taskId/activity-logs", getActivityLogs);

  // Calendar routes
  app.get("/api/calendar/tasks", getCalendarTasks);
  app.get("/api/calendar/tasks/filter", getFilteredCalendarTasks);

  // Project routes
  app.get("/api/projects", getProjects);
  app.get("/api/projects/:id", getProject);
  app.post("/api/projects", createProject);
  app.put("/api/projects/:id", updateProject);
  app.delete("/api/projects/:id", deleteProject);

  // Project member routes
  app.get("/api/projects/:id/members", getProjectMembers);
  app.patch("/api/projects/:id/members/:memberId", updateMemberRole);
  app.delete("/api/projects/:id/members/:memberId", removeMember);

  // Project invitation routes
  app.post("/api/projects/:id/invite", inviteMember);
  app.get("/api/projects/:id/invitations", getProjectInvitations);
  app.post("/api/projects/join/:token", joinProject);
  app.delete("/api/projects/:id/invitations/:invitationId", cancelInvitation);

  return app;
}
