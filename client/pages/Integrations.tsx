import { useState, useEffect, useMemo } from "react";
import { Plug, Search, Check, X, ExternalLink, Unplug, ArrowLeft, Zap, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getIntegrations,
  connectIntegration,
  disconnectIntegration,
  CATEGORIES,
  type Integration,
} from "@/lib/integrations";
import { toast } from "sonner";

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [accountInput, setAccountInput] = useState("");

  useEffect(() => {
    setIntegrations(getIntegrations());
  }, []);

  const filtered = useMemo(() => {
    let list = integrations;
    if (activeCategory !== "all") {
      list = list.filter((i) => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [integrations, activeCategory, searchQuery]);

  const connectedCount = integrations.filter((i) => i.connected).length;

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setAccountInput("");
    setShowConnectModal(true);
  };

  const handleConfirmConnect = () => {
    if (!selectedIntegration) return;
    setConnectingId(selectedIntegration.id);

    // Simulate OAuth flow with a delay
    setTimeout(() => {
      const label = accountInput.trim() || `${selectedIntegration.name} Account`;
      const updated = connectIntegration(selectedIntegration.id, label);
      setIntegrations(updated);
      setConnectingId(null);
      setShowConnectModal(false);
      setSelectedIntegration(null);
      toast.success(`${selectedIntegration.name} connected successfully!`);
    }, 1500);
  };

  const handleDisconnect = (integration: Integration) => {
    const updated = disconnectIntegration(integration.id);
    setIntegrations(updated);
    toast(`${integration.name} disconnected`);
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
              Connect your favorite tools to ProUp. Centralize your workflow by linking design, communication, storage, and development apps.
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">{connectedCount} Connected</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border rounded-xl">
                <Plug className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{integrations.length} Available</span>
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
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                All
              </button>
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
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Integration grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((integration, i) => (
              <motion.div
                key={integration.id}
                className={`relative bg-card/80 backdrop-blur-sm border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all group ${
                  integration.connected
                    ? "border-green-500/30 bg-green-500/[0.02]"
                    : "border-border hover:border-primary/20"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Connected badge */}
                {integration.connected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Connected</span>
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: integration.color + "15" }}
                  >
                    {integration.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground">{integration.name}</h3>
                    <span className="text-[10px] text-muted-foreground capitalize">{integration.category}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {integration.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {integration.features.slice(0, 3).map((f) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 bg-secondary/60 text-muted-foreground rounded-md">
                      {f}
                    </span>
                  ))}
                  {integration.features.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 text-muted-foreground">
                      +{integration.features.length - 3} more
                    </span>
                  )}
                </div>

                {/* Account label if connected */}
                {integration.connected && integration.accountLabel && (
                  <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    {integration.accountLabel}
                    {integration.connectedAt && (
                      <span className="text-muted-foreground/60">
                        · since {new Date(integration.connectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </p>
                )}

                {/* Action button */}
                {integration.connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
                    onClick={() => handleDisconnect(integration)}
                  >
                    <Unplug className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(integration)}
                    disabled={connectingId === integration.id}
                  >
                    {connectingId === integration.id ? (
                      <>
                        <motion.div
                          className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-1.5"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plug className="w-3.5 h-3.5 mr-1.5" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Plug className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No integrations found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search or category</p>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-8 text-center">
            <p className="text-[11px] text-muted-foreground">
              More integrations coming soon · Request an integration via the feedback form
            </p>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      <AnimatePresence>
        {showConnectModal && selectedIntegration && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowConnectModal(false); setConnectingId(null); }} />

            <motion.div
              className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                    style={{ backgroundColor: selectedIntegration.color + "15" }}
                  >
                    {selectedIntegration.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Connect {selectedIntegration.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedIntegration.description}</p>
                  </div>
                </div>

                {/* Simulated OAuth */}
                <div className="mb-5 p-4 bg-secondary/20 border border-border rounded-xl">
                  <p className="text-xs font-semibold text-foreground mb-3">Authorize ProUp to access your {selectedIntegration.name} account</p>

                  <div className="space-y-2 mb-4">
                    {selectedIntegration.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-[10px] text-amber-800 dark:text-amber-300">
                      ProUp uses OAuth 2.0 for secure access. We never store your password.
                    </p>
                  </div>
                </div>

                {/* Account label input */}
                <div className="mb-5">
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Account label (optional)</label>
                  <Input
                    value={accountInput}
                    onChange={(e) => setAccountInput(e.target.value)}
                    placeholder={`e.g. john@company.com or My ${selectedIntegration.name}`}
                    className="rounded-xl text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowConnectModal(false); setConnectingId(null); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleConfirmConnect}
                    disabled={connectingId === selectedIntegration.id}
                  >
                    {connectingId === selectedIntegration.id ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Authorizing...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Authorize & Connect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
