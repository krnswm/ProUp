import { useState, useEffect, useMemo, useCallback } from "react";
import { Plug, Search, Check, Unplug, ArrowLeft, Zap, Shield, ExternalLink, Loader2, AlertCircle, FolderOpen, GitPullRequest, Calendar, Mail, Clock, MapPin, Users, Pen, Hash, FileText, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface IntegrationProvider {
  id: string;
  provider: string;
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
  dataEndpoint: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PanelData = any[];

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "storage", label: "Storage" },
  { key: "productivity", label: "Productivity" },
  { key: "communication", label: "Communication" },
  { key: "development", label: "Development" },
  { key: "design", label: "Design" },
];

export default function Integrations() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Per-card data panels
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<PanelData>([]);
  const [panelLoading, setPanelLoading] = useState(false);

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
      window.history.replaceState({}, "", "/integrations");
    }
    if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", "/integrations");
    }
  }, [searchParams, fetchProviders]);

  const filtered = useMemo(() => {
    let list = providers;
    if (activeCategory !== "all") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [providers, activeCategory, searchQuery]);

  const connectedCount = new Set(providers.filter((p) => p.connected).map((p) => p.provider)).size;

  // OAuth connect — uses the provider field (google/github) for the auth URL
  const handleConnect = async (provider: IntegrationProvider) => {
    if (!provider.configured) {
      toast.error(`${provider.name} is not configured. Add the required credentials to your .env file.`);
      return;
    }
    setConnectingId(provider.id);
    try {
      const res = await api(`/api/integrations/${provider.provider}/auth`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
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
      const res = await api(`/api/integrations/${provider.provider}`, { method: "DELETE" });
      if (res.ok) {
        toast(`${provider.name} disconnected`);
        fetchProviders();
        setActivePanel(null);
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // Fetch data for any panel using its dataEndpoint
  const fetchPanelData = useCallback(async (endpoint: string) => {
    setPanelLoading(true);
    setPanelData([]);
    try {
      const res = await api(endpoint);
      if (res.ok) {
        const data = await res.json();
        setPanelData(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setPanelLoading(false);
  }, []);

  const togglePanel = (provider: IntegrationProvider) => {
    if (activePanel === provider.id) {
      setActivePanel(null);
      return;
    }
    setActivePanel(provider.id);
    fetchPanelData(provider.dataEndpoint);
  };

  // Render data panel content based on which integration is active
  const renderPanelContent = () => {
    if (!activePanel) return null;
    const provider = providers.find((p) => p.id === activePanel);
    if (!provider) return null;

    const panelConfig: Record<string, { title: string; icon: React.ReactNode; renderItem: (item: any, i: number) => React.ReactNode }> = {
      "google-drive": {
        title: "Google Drive — Recent Files",
        icon: <FolderOpen className="w-4 h-4 text-blue-500" />,
        renderItem: (file) => (
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
                {file.modifiedTime && new Date(file.modifiedTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                {file.size && ` · ${(parseInt(file.size) / 1024).toFixed(0)} KB`}
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ),
      },
      "google-calendar": {
        title: "Google Calendar — Upcoming Events",
        icon: <Calendar className="w-4 h-4 text-green-500" />,
        renderItem: (event) => (
          <a
            key={event.id}
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex flex-col items-center justify-center flex-shrink-0">
              {event.start ? (
                <>
                  <span className="text-[9px] font-bold text-green-600 uppercase">
                    {new Date(event.start).toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-400 -mt-0.5">
                    {new Date(event.start).getDate()}
                  </span>
                </>
              ) : (
                <Calendar className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{event.title}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {event.start && !event.allDay && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {event.end && ` – ${new Date(event.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                  </span>
                )}
                {event.allDay && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded">All day</span>
                )}
                {event.location && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                )}
                {event.attendees > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.attendees}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          </a>
        ),
      },
      "google-gmail": {
        title: "Gmail — Recent Emails",
        icon: <Mail className="w-4 h-4 text-red-500" />,
        renderItem: (msg) => (
          <a
            key={msg.id}
            href={msg.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors group ${
              msg.unread
                ? "border-blue-500/20 bg-blue-500/[0.02] hover:bg-blue-500/[0.05]"
                : "border-border hover:bg-secondary/30"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              msg.unread ? "bg-blue-500/15 text-blue-600" : "bg-secondary text-muted-foreground"
            }`}>
              {(msg.from || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm truncate ${msg.unread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                  {msg.subject}
                </p>
                {msg.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msg.from}</p>
              <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{msg.snippet}</p>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
              {msg.date && new Date(msg.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </a>
        ),
      },
      "github": {
        title: "GitHub — Your Repositories",
        icon: <GitPullRequest className="w-4 h-4 text-gray-700 dark:text-gray-300" />,
        renderItem: (repo) => (
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
                {repo.language && <span className="text-[10px] text-muted-foreground">{repo.language}</span>}
                <span className="text-[10px] text-muted-foreground">&#11088; {repo.stars}</span>
                <span className="text-[10px] text-muted-foreground">
                  Updated {new Date(repo.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        ),
      },
      "figma": {
        title: "Figma — Your Design Files",
        icon: <Pen className="w-4 h-4 text-purple-500" />,
        renderItem: (file) => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors group"
          >
            {file.thumbnailUrl ? (
              <img src={file.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Pen className="w-4 h-4 text-purple-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {file.projectName && (
                  <span className="text-[10px] text-muted-foreground">{file.projectName}</span>
                )}
                {file.lastModified && (
                  <span className="text-[10px] text-muted-foreground">
                    Updated {new Date(file.lastModified).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        ),
      },
      "slack": {
        title: "Slack — Your Channels",
        icon: <Hash className="w-4 h-4 text-purple-800 dark:text-purple-300" />,
        renderItem: (ch) => (
          <a
            key={ch.id}
            href={ch.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-900/10 flex items-center justify-center flex-shrink-0">
              {ch.isPrivate ? <Lock className="w-4 h-4 text-amber-500" /> : <Hash className="w-4 h-4 text-purple-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{ch.name}</p>
                {ch.isPrivate && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded">Private</span>
                )}
              </div>
              {ch.purpose && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{ch.purpose}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {ch.memberCount} members
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        ),
      },
      "notion": {
        title: "Notion — Your Pages & Databases",
        icon: <FileText className="w-4 h-4 text-gray-900 dark:text-gray-100" />,
        renderItem: (item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-lg">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
                <span className="text-[9px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded capitalize">{item.type}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {item.lastEdited && (
                  <span className="text-[10px] text-muted-foreground">
                    Edited {new Date(item.lastEdited).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        ),
      },
    };

    const config = panelConfig[activePanel];
    if (!config) return null;

    return (
      <motion.div
        key={activePanel}
        className="bg-card border border-border rounded-2xl p-5 shadow-lg mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            {config.icon}
            {config.title}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchPanelData(provider.dataEndpoint)}
            disabled={panelLoading}
          >
            {panelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {panelLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : panelData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No data found</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {panelData.map((item, i) => config.renderItem(item, i))}
          </div>
        )}
      </motion.div>
    );
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
              Connect external tools to ProUp via OAuth 2.0. Access your Drive files, Calendar events, Gmail, GitHub repos — each independently.
            </p>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">{connectedCount} Connected</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border rounded-xl">
                <Plug className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{providers.length} Services</span>
              </div>
            </div>
          </motion.div>

          {/* Search + Category filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="pl-9 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeCategory === cat.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {filtered.map((provider, i) => (
                  <motion.div
                    key={provider.id}
                    className={`relative bg-card/80 backdrop-blur-sm border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all ${
                      provider.connected
                        ? "border-green-500/30 bg-green-500/[0.02]"
                        : "border-border hover:border-primary/20"
                    } ${activePanel === provider.id ? "ring-2 ring-primary/30" : ""}`}
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
                    {!provider.configured && !provider.connected && (
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
                            onClick={() => togglePanel(provider)}
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

              {/* Data panel */}
              <AnimatePresence mode="wait">
                {renderPanelContent()}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
