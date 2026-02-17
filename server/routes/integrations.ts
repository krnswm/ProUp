import { RequestHandler } from "express";
import { prisma } from "../prisma";

// ── ENV config (read at request time to ensure dotenv has loaded) ──
function env() {
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
    FIGMA_CLIENT_ID: process.env.FIGMA_CLIENT_ID || "",
    FIGMA_CLIENT_SECRET: process.env.FIGMA_CLIENT_SECRET || "",
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || "",
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || "",
    NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID || "",
    NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET || "",
    APP_URL: process.env.APP_URL || "http://localhost:8080",
  };
}

// ── Helpers ─────────────────────────────────────────────────────
function googleRedirectUri() {
  return `${env().APP_URL}/api/integrations/google/callback`;
}
function githubRedirectUri() {
  return `${env().APP_URL}/api/integrations/github/callback`;
}
function figmaRedirectUri() {
  return `${env().APP_URL}/api/integrations/figma/callback`;
}
function slackRedirectUri() {
  return `${env().APP_URL}/api/integrations/slack/callback`;
}
function notionRedirectUri() {
  return `${env().APP_URL}/api/integrations/notion/callback`;
}

// ── GET /api/integrations — list connected integrations ─────────
export const listIntegrations: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const tokens = await prisma.oAuthToken.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        accountLabel: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const googleToken = tokens.find((t) => t.provider === "google");
    const githubToken = tokens.find((t) => t.provider === "github");
    const figmaToken = tokens.find((t) => t.provider === "figma");
    const slackToken = tokens.find((t) => t.provider === "slack");
    const notionToken = tokens.find((t) => t.provider === "notion");
    const googleConfigured = !!env().GOOGLE_CLIENT_ID;
    const githubConfigured = !!env().GITHUB_CLIENT_ID;
    const figmaConfigured = !!env().FIGMA_CLIENT_ID;
    const slackConfigured = !!env().SLACK_CLIENT_ID;
    const notionConfigured = !!env().NOTION_CLIENT_ID;

    // Build response — Google split into Drive, Calendar, Gmail (share one OAuth token)
    const result = [
      {
        id: "google-drive",
        provider: "google",
        name: "Google Drive",
        description: "Access and browse your Google Drive files, docs, sheets, and presentations",
        icon: "📁",
        category: "storage",
        color: "#4285f4",
        features: ["Browse files", "Recent documents", "Search files", "View in Drive"],
        configured: googleConfigured,
        connected: !!googleToken,
        accountLabel: googleToken?.accountLabel || null,
        connectedAt: googleToken?.createdAt || null,
        scope: googleToken?.scope || null,
        dataEndpoint: "/api/integrations/google/drive/files",
      },
      {
        id: "google-calendar",
        provider: "google",
        name: "Google Calendar",
        description: "View upcoming events, meetings, and deadlines from your Google Calendar",
        icon: "�",
        category: "productivity",
        color: "#0f9d58",
        features: ["Upcoming events", "Meeting details", "Event links", "All-day events"],
        configured: googleConfigured,
        connected: !!googleToken,
        accountLabel: googleToken?.accountLabel || null,
        connectedAt: googleToken?.createdAt || null,
        scope: googleToken?.scope || null,
        dataEndpoint: "/api/integrations/google/calendar/events",
      },
      {
        id: "google-gmail",
        provider: "google",
        name: "Gmail",
        description: "View recent emails and threads from your Gmail inbox",
        icon: "✉️",
        category: "communication",
        color: "#ea4335",
        features: ["Recent emails", "Inbox threads", "Sender info", "Open in Gmail"],
        configured: googleConfigured,
        connected: !!googleToken,
        accountLabel: googleToken?.accountLabel || null,
        connectedAt: googleToken?.createdAt || null,
        scope: googleToken?.scope || null,
        dataEndpoint: "/api/integrations/google/gmail/messages",
      },
      {
        id: "github",
        provider: "github",
        name: "GitHub",
        description: "Repositories, pull requests, issues — link code to tasks",
        icon: "🐙",
        category: "development",
        color: "#24292e",
        features: ["List repositories", "Pull requests", "Issues", "Commit history"],
        configured: githubConfigured,
        connected: !!githubToken,
        accountLabel: githubToken?.accountLabel || null,
        connectedAt: githubToken?.createdAt || null,
        scope: githubToken?.scope || null,
        dataEndpoint: "/api/integrations/github/repos",
      },
      {
        id: "figma",
        provider: "figma",
        name: "Figma",
        description: "Browse your Figma files and projects, preview designs linked to tasks",
        icon: "🎨",
        category: "design",
        color: "#a259ff",
        features: ["Browse files", "Project list", "Design previews", "Open in Figma"],
        configured: figmaConfigured,
        connected: !!figmaToken,
        accountLabel: figmaToken?.accountLabel || null,
        connectedAt: figmaToken?.createdAt || null,
        scope: figmaToken?.scope || null,
        dataEndpoint: "/api/integrations/figma/files",
      },
      {
        id: "slack",
        provider: "slack",
        name: "Slack",
        description: "View your Slack channels and recent messages, bridge team communication",
        icon: "💬",
        category: "communication",
        color: "#4a154b",
        features: ["List channels", "Recent messages", "Team info", "Open in Slack"],
        configured: slackConfigured,
        connected: !!slackToken,
        accountLabel: slackToken?.accountLabel || null,
        connectedAt: slackToken?.createdAt || null,
        scope: slackToken?.scope || null,
        dataEndpoint: "/api/integrations/slack/channels",
      },
      {
        id: "notion",
        provider: "notion",
        name: "Notion",
        description: "Access your Notion pages and databases, link docs to project tasks",
        icon: "📝",
        category: "productivity",
        color: "#000000",
        features: ["Browse pages", "Databases", "Search content", "Open in Notion"],
        configured: notionConfigured,
        connected: !!notionToken,
        accountLabel: notionToken?.accountLabel || null,
        connectedAt: notionToken?.createdAt || null,
        scope: notionToken?.scope || null,
        dataEndpoint: "/api/integrations/notion/pages",
      },
    ];

    res.json(result);
  } catch (error) {
    console.error("Error listing integrations:", error);
    res.status(500).json({ error: "Failed to list integrations" });
  }
};

// ── DELETE /api/integrations/:provider — disconnect ─────────────
export const disconnectIntegration: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const provider = req.params.provider as string;
    if (!["google", "github", "figma", "slack", "notion"].includes(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }

    await prisma.oAuthToken.deleteMany({ where: { userId, provider } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    res.status(500).json({ error: "Failed to disconnect" });
  }
};

// ── GOOGLE OAuth ────────────────────────────────────────────────

// GET /api/integrations/google/auth — redirect to Google consent
export const googleAuth: RequestHandler = (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!env().GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env" });
  }

  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const params = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: String(userId),
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
};

// GET /api/integrations/google/callback — exchange code for tokens
export const googleCallback: RequestHandler = async (req, res) => {
  try {
    const code = req.query.code as string;
    const userId = parseInt(req.query.state as string);

    if (!code || !userId) {
      return res.redirect(`${env().APP_URL}/integrations?error=missing_params`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env().GOOGLE_CLIENT_ID,
        client_secret: env().GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Google token exchange failed:", err);
      return res.redirect(`${env().APP_URL}/integrations?error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();

    // Get user info for account label
    let accountLabel = "Google Account";
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        accountLabel = userInfo.email || userInfo.name || accountLabel;
      }
    } catch { /* ignore */ }

    // Upsert token
    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId, provider: "google" } },
      create: {
        userId,
        provider: "google",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        scope: tokenData.scope || null,
        accountLabel,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        scope: tokenData.scope || undefined,
        accountLabel,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
      },
    });

    res.redirect(`${env().APP_URL}/integrations?connected=google`);
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${env().APP_URL}/integrations?error=callback_failed`);
  }
};

// ── GITHUB OAuth ────────────────────────────────────────────────

// GET /api/integrations/github/auth — redirect to GitHub consent
export const githubAuth: RequestHandler = (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!env().GITHUB_CLIENT_ID) {
    return res.status(500).json({ error: "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env" });
  }

  const params = new URLSearchParams({
    client_id: env().GITHUB_CLIENT_ID,
    redirect_uri: githubRedirectUri(),
    scope: "repo read:user user:email",
    state: String(userId),
  });

  res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
};

// GET /api/integrations/github/callback — exchange code for tokens
export const githubCallback: RequestHandler = async (req, res) => {
  try {
    const code = req.query.code as string;
    const userId = parseInt(req.query.state as string);

    if (!code || !userId) {
      return res.redirect(`${env().APP_URL}/integrations?error=missing_params`);
    }

    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env().GITHUB_CLIENT_ID,
        client_secret: env().GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: githubRedirectUri(),
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("GitHub token exchange failed:", err);
      return res.redirect(`${env().APP_URL}/integrations?error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("GitHub token error:", tokenData.error_description);
      return res.redirect(`${env().APP_URL}/integrations?error=${tokenData.error}`);
    }

    // Get user info for account label
    let accountLabel = "GitHub Account";
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        accountLabel = userData.login || userData.name || accountLabel;
      }
    } catch { /* ignore */ }

    // Upsert token
    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId, provider: "github" } },
      create: {
        userId,
        provider: "github",
        accessToken: tokenData.access_token,
        refreshToken: null,
        scope: tokenData.scope || null,
        accountLabel,
        expiresAt: null, // GitHub tokens don't expire
      },
      update: {
        accessToken: tokenData.access_token,
        scope: tokenData.scope || undefined,
        accountLabel,
      },
    });

    res.redirect(`${env().APP_URL}/integrations?connected=github`);
  } catch (error) {
    console.error("GitHub callback error:", error);
    res.redirect(`${env().APP_URL}/integrations?error=callback_failed`);
  }
};

// ── Google token helper ──────────────────────────────────────────
async function getGoogleAccessToken(userId: number): Promise<{ accessToken: string } | null> {
  const token = await prisma.oAuthToken.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!token) return null;

  let accessToken = token.accessToken;
  if (token.expiresAt && new Date(token.expiresAt) < new Date() && token.refreshToken) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env().GOOGLE_CLIENT_ID,
        client_secret: env().GOOGLE_CLIENT_SECRET,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      accessToken = refreshData.access_token;
      await prisma.oAuthToken.update({
        where: { id: token.id },
        data: {
          accessToken,
          expiresAt: refreshData.expires_in
            ? new Date(Date.now() + refreshData.expires_in * 1000)
            : undefined,
        },
      });
    }
  }
  return { accessToken };
}

// ── Google Drive API proxy ──────────────────────────────────────

// GET /api/integrations/google/drive/files — list recent Drive files
export const googleDriveFiles: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const google = await getGoogleAccessToken(userId);
    if (!google) return res.status(404).json({ error: "Google not connected" });

    const query = (req.query.q as string) || "";
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const params = new URLSearchParams({
      pageSize: String(pageSize),
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,thumbnailLink,size)",
    });
    if (query) params.set("q", `name contains '${query.replace(/'/g, "\\'")}'`);

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${google.accessToken}` },
    });

    if (!driveRes.ok) {
      const err = await driveRes.text();
      console.error("Drive API error:", err);
      return res.status(driveRes.status).json({ error: "Drive API error" });
    }

    const data = await driveRes.json();
    res.json(data.files || []);
  } catch (error) {
    console.error("Error fetching Drive files:", error);
    res.status(500).json({ error: "Failed to fetch Drive files" });
  }
};

// ── Google Calendar API proxy ───────────────────────────────────

// GET /api/integrations/google/calendar/events — list upcoming events
export const googleCalendarEvents: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const google = await getGoogleAccessToken(userId);
    if (!google) return res.status(404).json({ error: "Google not connected" });

    const maxResults = parseInt(req.query.maxResults as string) || 15;
    const params = new URLSearchParams({
      maxResults: String(maxResults),
      orderBy: "startTime",
      singleEvents: "true",
      timeMin: new Date().toISOString(),
      fields: "items(id,summary,description,start,end,htmlLink,location,status,creator,attendees)",
    });

    const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${google.accessToken}` },
    });

    if (!calRes.ok) {
      const err = await calRes.text();
      console.error("Calendar API error:", err);
      return res.status(calRes.status).json({ error: "Calendar API error" });
    }

    const data = await calRes.json();
    res.json(
      (data.items || []).map((e: any) => ({
        id: e.id,
        title: e.summary || "(No title)",
        description: e.description || null,
        location: e.location || null,
        start: e.start?.dateTime || e.start?.date || null,
        end: e.end?.dateTime || e.end?.date || null,
        allDay: !e.start?.dateTime,
        htmlLink: e.htmlLink,
        status: e.status,
        creator: e.creator?.email || null,
        attendees: (e.attendees || []).length,
      }))
    );
  } catch (error) {
    console.error("Error fetching Calendar events:", error);
    res.status(500).json({ error: "Failed to fetch Calendar events" });
  }
};

// ── Gmail API proxy ─────────────────────────────────────────────

// GET /api/integrations/google/gmail/messages — list recent emails
export const googleGmailMessages: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const google = await getGoogleAccessToken(userId);
    if (!google) return res.status(404).json({ error: "Google not connected" });

    const maxResults = parseInt(req.query.maxResults as string) || 15;

    // List message IDs
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${google.accessToken}` } }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      console.error("Gmail list error:", err);
      return res.status(listRes.status).json({ error: "Gmail API error" });
    }

    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

    if (messageIds.length === 0) return res.json([]);

    // Fetch each message's metadata in parallel
    const messages = await Promise.all(
      messageIds.map(async (id) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${google.accessToken}` } }
        );
        if (!msgRes.ok) return null;
        const msg = await msgRes.json();
        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || "";
        return {
          id: msg.id,
          threadId: msg.threadId,
          subject: getHeader("Subject") || "(No subject)",
          from: getHeader("From"),
          date: getHeader("Date"),
          snippet: msg.snippet || "",
          labelIds: msg.labelIds || [],
          unread: (msg.labelIds || []).includes("UNREAD"),
          htmlLink: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
        };
      })
    );

    res.json(messages.filter(Boolean));
  } catch (error) {
    console.error("Error fetching Gmail messages:", error);
    res.status(500).json({ error: "Failed to fetch Gmail messages" });
  }
};

// ── GitHub API proxy ────────────────────────────────────────────

// GET /api/integrations/github/repos — list user repos
export const githubRepos: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const token = await prisma.oAuthToken.findUnique({
      where: { userId_provider: { userId, provider: "github" } },
    });

    if (!token) return res.status(404).json({ error: "GitHub not connected" });

    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;

    const ghRes = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: "GitHub API error" });
    }

    const repos = await ghRes.json();
    res.json(
      repos.map((r: any) => ({
        id: r.id,
        name: r.full_name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        updatedAt: r.updated_at,
        private: r.private,
      }))
    );
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    res.status(500).json({ error: "Failed to fetch repos" });
  }
};

// GET /api/integrations/github/repos/:owner/:repo/pulls — list PRs
export const githubPulls: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const token = await prisma.oAuthToken.findUnique({
      where: { userId_provider: { userId, provider: "github" } },
    });

    if (!token) return res.status(404).json({ error: "GitHub not connected" });

    const { owner, repo } = req.params;

    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: "GitHub API error" });
    }

    const pulls = await ghRes.json();
    res.json(
      pulls.map((p: any) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        url: p.html_url,
        state: p.state,
        author: p.user?.login,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }))
    );
  } catch (error) {
    console.error("Error fetching GitHub PRs:", error);
    res.status(500).json({ error: "Failed to fetch PRs" });
  }
};

// ── FIGMA OAuth ─────────────────────────────────────────────────

export const figmaAuth: RequestHandler = (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!env().FIGMA_CLIENT_ID) {
    return res.status(500).json({ error: "Figma OAuth not configured" });
  }
  const params = new URLSearchParams({
    client_id: env().FIGMA_CLIENT_ID,
    redirect_uri: figmaRedirectUri(),
    scope: "current_user:read,file_content:read,file_metadata:read,projects:read",
    state: String(userId),
    response_type: "code",
  });
  res.json({ url: `https://www.figma.com/oauth?${params}` });
};

export const figmaCallback: RequestHandler = async (req, res) => {
  try {
    const code = req.query.code as string;
    const userId = parseInt(req.query.state as string);
    if (!code || !userId) return res.redirect(`${env().APP_URL}/integrations?error=missing_params`);

    const basicAuth = Buffer.from(`${env().FIGMA_CLIENT_ID}:${env().FIGMA_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://api.figma.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        redirect_uri: figmaRedirectUri(),
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return res.redirect(`${env().APP_URL}/integrations?error=token_exchange_failed`);
    const tokenData = await tokenRes.json();

    let accountLabel = "Figma Account";
    try {
      const meRes = await fetch("https://api.figma.com/v1/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        accountLabel = me.email || me.handle || accountLabel;
      }
    } catch { /* ignore */ }

    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId, provider: "figma" } },
      create: {
        userId, provider: "figma",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        scope: "files:read",
        accountLabel,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        accountLabel,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      },
    });
    res.redirect(`${env().APP_URL}/integrations?connected=figma`);
  } catch (error) {
    console.error("Figma callback error:", error);
    res.redirect(`${env().APP_URL}/integrations?error=callback_failed`);
  }
};

// GET /api/integrations/figma/files — list recent Figma files via me → teams → projects → files
export const figmaFiles: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const token = await prisma.oAuthToken.findUnique({
      where: { userId_provider: { userId, provider: "figma" } },
    });
    if (!token) return res.status(404).json({ error: "Figma not connected" });

    const headers = { Authorization: `Bearer ${token.accessToken}` };

    // Get current user info (includes team memberships)
    const meRes = await fetch("https://api.figma.com/v1/me", { headers });
    if (!meRes.ok) return res.status(meRes.status).json({ error: "Figma API error" });
    const me = await meRes.json();

    const files: any[] = [];

    // Try teams → projects → files chain
    const teamIds: string[] = Object.keys(me.teams || {});
    for (const teamId of teamIds.slice(0, 3)) {
      try {
        const projRes = await fetch(`https://api.figma.com/v1/teams/${teamId}/projects`, { headers });
        if (!projRes.ok) continue;
        const projData = await projRes.json();

        for (const project of (projData.projects || []).slice(0, 5)) {
          try {
            const filesRes = await fetch(`https://api.figma.com/v1/projects/${project.id}/files`, { headers });
            if (!filesRes.ok) continue;
            const filesData = await filesRes.json();

            for (const file of filesData.files || []) {
              files.push({
                id: file.key,
                name: file.name,
                thumbnailUrl: file.thumbnail_url,
                lastModified: file.last_modified,
                url: `https://www.figma.com/design/${file.key}`,
                projectName: project.name,
              });
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    files.sort((a, b) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime());
    res.json(files.slice(0, 20));
  } catch (error) {
    console.error("Error fetching Figma files:", error);
    res.status(500).json({ error: "Failed to fetch Figma files" });
  }
};

// ── SLACK OAuth ─────────────────────────────────────────────────

export const slackAuth: RequestHandler = (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!env().SLACK_CLIENT_ID) {
    return res.status(500).json({ error: "Slack OAuth not configured" });
  }
  const params = new URLSearchParams({
    client_id: env().SLACK_CLIENT_ID,
    redirect_uri: slackRedirectUri(),
    scope: "channels:read,channels:history,team:read,users:read",
    state: String(userId),
  });
  res.json({ url: `https://slack.com/oauth/v2/authorize?${params}` });
};

export const slackCallback: RequestHandler = async (req, res) => {
  try {
    const code = req.query.code as string;
    const userId = parseInt(req.query.state as string);
    if (!code || !userId) return res.redirect(`${env().APP_URL}/integrations?error=missing_params`);

    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env().SLACK_CLIENT_ID,
        client_secret: env().SLACK_CLIENT_SECRET,
        code,
        redirect_uri: slackRedirectUri(),
      }),
    });
    if (!tokenRes.ok) return res.redirect(`${env().APP_URL}/integrations?error=token_exchange_failed`);
    const tokenData = await tokenRes.json();
    if (!tokenData.ok) return res.redirect(`${env().APP_URL}/integrations?error=${tokenData.error || "slack_error"}`);

    const accessToken = tokenData.access_token;
    const teamName = tokenData.team?.name || "Slack Workspace";

    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId, provider: "slack" } },
      create: {
        userId, provider: "slack",
        accessToken,
        refreshToken: null,
        scope: tokenData.scope || null,
        accountLabel: teamName,
        expiresAt: null,
      },
      update: { accessToken, scope: tokenData.scope || undefined, accountLabel: teamName },
    });
    res.redirect(`${env().APP_URL}/integrations?connected=slack`);
  } catch (error) {
    console.error("Slack callback error:", error);
    res.redirect(`${env().APP_URL}/integrations?error=callback_failed`);
  }
};

// GET /api/integrations/slack/channels — list Slack channels
export const slackChannels: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const token = await prisma.oAuthToken.findUnique({
      where: { userId_provider: { userId, provider: "slack" } },
    });
    if (!token) return res.status(404).json({ error: "Slack not connected" });

    const chRes = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=20", {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!chRes.ok) return res.status(chRes.status).json({ error: "Slack API error" });
    const data = await chRes.json();
    if (!data.ok) return res.status(400).json({ error: data.error || "Slack API error" });

    res.json(
      (data.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        topic: ch.topic?.value || "",
        purpose: ch.purpose?.value || "",
        memberCount: ch.num_members || 0,
        isPrivate: ch.is_private,
        url: `https://slack.com/app_redirect?channel=${ch.id}`,
      }))
    );
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    res.status(500).json({ error: "Failed to fetch Slack channels" });
  }
};

// ── NOTION OAuth ────────────────────────────────────────────────

export const notionAuth: RequestHandler = (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!env().NOTION_CLIENT_ID) {
    return res.status(500).json({ error: "Notion OAuth not configured" });
  }
  const params = new URLSearchParams({
    client_id: env().NOTION_CLIENT_ID,
    redirect_uri: notionRedirectUri(),
    response_type: "code",
    owner: "user",
    state: `user_${userId}`,
  });
  res.json({ url: `https://api.notion.com/v1/oauth/authorize?${params}` });
};

export const notionCallback: RequestHandler = async (req, res) => {
  try {
    const code = req.query.code as string;
    const stateStr = (req.query.state as string || "").replace("user_", "");
    const userId = parseInt(stateStr);
    if (!code || !userId) return res.redirect(`${env().APP_URL}/integrations?error=missing_params`);

    const basicAuth = Buffer.from(`${env().NOTION_CLIENT_ID}:${env().NOTION_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: notionRedirectUri(),
      }),
    });
    if (!tokenRes.ok) return res.redirect(`${env().APP_URL}/integrations?error=token_exchange_failed`);
    const tokenData = await tokenRes.json();

    const accountLabel = tokenData.workspace_name || tokenData.owner?.user?.name || "Notion Workspace";

    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId, provider: "notion" } },
      create: {
        userId, provider: "notion",
        accessToken: tokenData.access_token,
        refreshToken: null,
        scope: null,
        accountLabel,
        expiresAt: null,
      },
      update: { accessToken: tokenData.access_token, accountLabel },
    });
    res.redirect(`${env().APP_URL}/integrations?connected=notion`);
  } catch (error) {
    console.error("Notion callback error:", error);
    res.redirect(`${env().APP_URL}/integrations?error=callback_failed`);
  }
};

// GET /api/integrations/notion/pages — list Notion pages
export const notionPages: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const token = await prisma.oAuthToken.findUnique({
      where: { userId_provider: { userId, provider: "notion" } },
    });
    if (!token) return res.status(404).json({ error: "Notion not connected" });

    const searchRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        page_size: 20,
        sort: { direction: "descending", timestamp: "last_edited_time" },
      }),
    });
    if (!searchRes.ok) return res.status(searchRes.status).json({ error: "Notion API error" });
    const data = await searchRes.json();

    res.json(
      (data.results || []).map((item: any) => {
        const isDb = item.object === "database";
        const title = isDb
          ? (item.title || []).map((t: any) => t.plain_text).join("") || "(Untitled database)"
          : (item.properties?.title?.title || item.properties?.Name?.title || []).map((t: any) => t.plain_text).join("") || "(Untitled page)";
        const icon = item.icon?.emoji || (isDb ? "📊" : "📄");
        return {
          id: item.id,
          title,
          icon,
          type: item.object,
          url: item.url,
          lastEdited: item.last_edited_time,
          createdTime: item.created_time,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching Notion pages:", error);
    res.status(500).json({ error: "Failed to fetch Notion pages" });
  }
};
