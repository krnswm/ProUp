import { RequestHandler } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authorize";

type LeaderUser = { id: number; name: string; email: string };

const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

const computeStreakEndingToday = (dateKeysDesc: string[], todayKey: string) => {
  if (dateKeysDesc.length === 0) return 0;
  if (dateKeysDesc[0] !== todayKey) return 0;

  let streak = 1;
  let current = new Date(todayKey);

  for (let i = 1; i < dateKeysDesc.length; i++) {
    current.setDate(current.getDate() - 1);
    const expected = toDateKey(current);
    if (dateKeysDesc[i] !== expected) break;
    streak += 1;
  }

  return streak;
};

// GET /api/projects/:projectId/leaderboard
// Computes per-user completion leaderboard for a project.
export const getProjectLeaderboard: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const projectIdRaw = (req.params as any).projectId;
    const projectId = parseInt(Array.isArray(projectIdRaw) ? projectIdRaw[0] : String(projectIdRaw));
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const now = new Date();
    const todayKey = toDateKey(now);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const historyStart = new Date(now);
    historyStart.setDate(historyStart.getDate() - 60);
    historyStart.setHours(0, 0, 0, 0);

    // We treat a completion as an ActivityLog where status changed to done.
    const logs = await prisma.activityLog.findMany({
      where: {
        fieldName: "status",
        newValue: "done",
        timestamp: { gte: historyStart },
        task: { projectId },
      },
      select: {
        userId: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
    });

    const byUser = new Map<string, { dates: Set<string>; weekCount: number; todayCount: number }>();

    for (const l of logs) {
      const key = String(l.userId ?? "").trim();
      if (!key || key === "system") continue;

      const entry = byUser.get(key) ?? { dates: new Set<string>(), weekCount: 0, todayCount: 0 };
      const dateKey = toDateKey(l.timestamp);
      entry.dates.add(dateKey);

      if (l.timestamp >= weekStart) entry.weekCount += 1;
      if (dateKey === todayKey) entry.todayCount += 1;

      byUser.set(key, entry);
    }

    const userIds = Array.from(byUser.keys())
      .map((id) => parseInt(id))
      .filter((id) => !Number.isNaN(id));

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map<string, LeaderUser>(users.map((u) => [String(u.id), u] as const));

    const leaderboard = Array.from(byUser.entries()).map(([uid, entry]) => {
      const uniqueDatesDesc = Array.from(entry.dates).sort((a, b) => (a > b ? -1 : 1));
      const streak = computeStreakEndingToday(uniqueDatesDesc, todayKey);
      const user = userMap.get(uid);

      return {
        userId: uid,
        name: user?.name ?? `User ${uid}`,
        email: user?.email ?? null,
        completedToday: entry.todayCount,
        completedLast7Days: entry.weekCount,
        streak,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.completedLast7Days !== a.completedLast7Days) return b.completedLast7Days - a.completedLast7Days;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return b.completedToday - a.completedToday;
    });

    res.json({ projectId, today: todayKey, leaderboard });
  } catch (error) {
    console.error("Error computing leaderboard:", error);
    res.status(500).json({ error: "Failed to compute leaderboard" });
  }
};
