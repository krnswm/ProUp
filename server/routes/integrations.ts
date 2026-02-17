import { RequestHandler } from "express";
import { prisma } from "../prisma";

// ── ENV config (read at request time to ensure dotenv has loaded) ──
function env() {
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
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
    const googleConfigured = !!env().GOOGLE_CLIENT_ID;
    const githubConfigured = !!env().GITHUB_CLIENT_ID;

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
    if (!["google", "github"].includes(provider)) {
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
