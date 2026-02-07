import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getTasks, getTask, createTask, updateTask, deleteTask } from "./routes/tasks";
import { getActivityLogs } from "./routes/activityLogs";
import { getCalendarTasks, getFilteredCalendarTasks } from "./routes/calendar";

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

  return app;
}
