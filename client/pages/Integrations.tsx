import { useState, useEffect, useMemo, useCallback } from "react";
import { Plug, Search, Check, Unplug, ArrowLeft, Zap, Shield, ExternalLink, Loader2, AlertCircle, FolderOpen, GitPullRequest } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  features: string[];
  configured: boolean;
  connected: boolean;
  accountLabel: string | null;
  connectedAt: string | null;
  scope: string | null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  iconLink?: string;
  size?: string;
}

interface GithubRepo {
  id: number;
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  updatedAt: string;
  private: boolean;
}

export default function Integrations() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Data panels
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await api("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setProviders(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Handle OAuth redirect results
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`);
      fetchProviders();
      // Clean URL
      window.history.replaceState({}, "", "/integrations");
    }
    if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", "/integrations");
    }
  }, [searchParams, fetchProviders]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [providers, searchQuery]);

  const connectedCount = providers.filter((p) => p.connected).length;

  // Real OAuth connect — gets auth URL from server, redirects browser
  const handleConnect = async (provider: IntegrationProvider) => {
    if (!provider.configured) {
      toast.error(`${provider.name} is not configured. Add ${provider.id.toUpperCase()}_CLIENT_ID and ${provider.id.toUpperCase()}_CLIENT_SECRET to your .env file.`);
      return;
    }

    setConnectingId(provider.id);
    try {
      const res = await api(`/api/integrations/${provider.id}/auth`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Redirect to OAuth provider
          window.location.href = data.url;
          return;
        }
      }
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      toast.error(err.error || "Failed to start OAuth flow");
    } catch {
      toast.error("Failed to connect");
    }
    setConnectingId(null);
  };

  const handleDisconnect = async (provider: IntegrationProvider) => {
    try {
      const res = await api(`/api/integrations/${provider.id}`, { method: "DELETE" });
      if (res.ok) {
        toast(`${provider.name} disconnected`);
        fetchProviders();
        if (activePanel === provider.id) setActivePanel(null);
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // Fetch Google Drive files
  const fetchDriveFiles = async () => {
    setDriveLoading(true);
    try {
      const res = await api("/api/integrations/google/drive/files?pageSize=15");
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setDriveLoading(false);
  };

  // Fetch GitHub repos
  const fetchGithubRepos = async () => {
    setGithubLoading(true);
    try {
      const res = await api("/api/integrations/github/repos?perPage=15");
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setGithubLoading(false);
  };

  const togglePanel = (providerId: string) => {
    if (activePanel === providerId) {
      setActivePanel(null);
      return;
    }
    setActivePanel(providerId);
    if (providerId === "google") fetchDriveFiles();
    if (providerId === "github") fetchGithubRepos();
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-indigo-50/20 dark:via-indigo-950/10 to-purple-50/20 dark:to-purple-950/10">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <motion.div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Integration Hub
              </h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-xl">
              Connect external tools to ProUp via OAuth 2.0. Access your Google Drive files, GitHub repos, and more — all from one place.
            </p>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">{connectedCount} Connected</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border rounded-xl">
                <Plug className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{providers.length} Available</span>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="pl-9 rounded-xl"
              />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Integration cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {filtered.map((provider, i) => (
                  <motion.div
                    key={provider.id}
                    className={`relative bg-card/80 backdrop-blur-sm border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all ${
                      provider.connected
                        ? "border-green-500/30 bg-green-500/[0.02]"
                        : "border-border hover:border-primary/20"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {/* Connected badge */}
                    {provider.connected && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Connected</span>
                      </div>
                    )}

                    {/* Not configured warning */}
                    {!provider.configured && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Not configured</span>
                      </div>
                    )}

                    {/* Icon + Name */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: provider.color + "15" }}
                      >
                        {provider.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-foreground">{provider.name}</h3>
                        <span className="text-[10px] text-muted-foreground capitalize">{provider.category}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {provider.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {provider.features.map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 bg-secondary/60 text-muted-foreground rounded-md">
                          {f}
                        </span>
                      ))}
                    </div>

                    {/* Account label */}
                    {provider.connected && provider.accountLabel && (
                      <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        {provider.accountLabel}
                        {provider.connectedAt && (
                          <span className="text-muted-foreground/60">
                            · since {new Date(provider.connectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {provider.connected ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => togglePanel(provider.id)}
                          >
                            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                            {activePanel === provider.id ? "Hide Data" : "Browse Data"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
                            onClick={() => handleDisconnect(provider)}
                          >
                            <Unplug className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          onClick={() => handleConnect(provider)}
                          disabled={connectingId === provider.id}
                        >
                          {connectingId === provider.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              {provider.configured ? "Connect with OAuth" : "Setup Required"}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <Plug className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No integrations found</p>
                </div>
              )}

              {/* Data panels */}
              <AnimatePresence>
                {activePanel === "google" && (
                  <motion.div
                    className="bg-card border border-border rounded-2xl p-5 shadow-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500" />
                        Google Drive — Recent Files
                      </h3>
                      <Button type="button" variant="outline" size="sm" onClick={fetchDriveFiles} disabled={driveLoading}>
                        {driveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
                      </Button>
                    </div>

                    {driveLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : driveFiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No files found</p>
                    ) : (
                      <div className="space-y-2">
                        {driveFiles.map((file) => (
                          <a
                            key={file.id}
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors group"
                          >
                            {file.iconLink && <img src={file.iconLink} alt="" className="w-5 h-5" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(file.modifiedTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                {file.size && ` · ${(parseInt(file.size) / 1024).toFixed(0)} KB`}
                              </p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activePanel === "github" && (
                  <motion.div
                    className="bg-card border border-border rounded-2xl p-5 shadow-lg"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <GitPullRequest className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        GitHub — Your Repositories
                      </h3>
                      <Button type="button" variant="outline" size="sm" onClick={fetchGithubRepos} disabled={githubLoading}>
                        {githubLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
                      </Button>
                    </div>

                    {githubLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : githubRepos.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No repositories found</p>
                    ) : (
                      <div className="space-y-2">
                        {githubRepos.map((repo) => (
                          <a
                            key={repo.id}
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{repo.name}</p>
                                {repo.private && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded">Private</span>
                                )}
                              </div>
                              {repo.description && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{repo.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                {repo.language && (
                                  <span className="text-[10px] text-muted-foreground">{repo.language}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">⭐ {repo.stars}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  Updated {new Date(repo.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Setup instructions */}
              <div className="mt-8 p-5 bg-secondary/20 border border-border rounded-2xl">
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Setup Instructions
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  To enable real OAuth connections, add these environment variables to your <code className="px-1.5 py-0.5 bg-secondary rounded text-[11px]">.env</code> file:
                </p>
                <pre className="text-[11px] bg-background border border-border rounded-xl p-4 overflow-x-auto font-mono text-muted-foreground leading-relaxed">
{`# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth (github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# App URL (for OAuth redirect)
APP_URL=http://localhost:8080`}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
