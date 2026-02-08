import { useState } from "react";
import { X, Mail, Shield, Copy, Check, Link } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InvitationResult {
  token: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface InviteMemberModalProps {
  isOpen: boolean;
  projectId: number;
  projectName: string;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<InvitationResult | void>;
}

const ROLES = [
  {
    value: "Admin",
    label: "Admin",
    description: "Can manage members, edit project, and all tasks",
    color: "text-red-600 dark:text-red-400",
  },
  {
    value: "Member",
    label: "Member",
    description: "Can edit project and manage tasks",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "Viewer",
    label: "Viewer",
    description: "Can only view project and tasks",
    color: "text-green-600 dark:text-green-400",
  },
];

export default function InviteMemberModal({
  isOpen,
  projectId,
  projectName,
  onClose,
  onInvite,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitationResult, setInvitationResult] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await onInvite(email, role);
      if (result && result.token) {
        setInvitationResult(result);
      } else {
        // If no result, just close (backward compatibility)
        setEmail("");
        setRole("Viewer");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("Viewer");
    setError("");
    setInvitationResult(null);
    setCopied(false);
    onClose();
  };

  const getInvitationLink = () => {
    if (!invitationResult?.token) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-project/${invitationResult.token}`;
  };

  const copyToClipboard = async () => {
    const link = getInvitationLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                {invitationResult ? (
                  <Link className="w-5 h-5 text-primary" />
                ) : (
                  <Mail className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {invitationResult ? "Invitation Created!" : "Invite Team Member"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {invitationResult ? "Share this link with your team member" : `to ${projectName}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Success State - Show Invitation Link */}
          {invitationResult ? (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-muted-foreground mb-2">
                  Invitation sent to <strong className="text-foreground">{invitationResult.email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Role: <span className="font-medium">{invitationResult.role}</span>
                </p>
              </div>

              {/* Invitation Link */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Share this invitation link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={getInvitationLink()}
                    readOnly
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-input/50 backdrop-blur-sm text-foreground text-sm font-mono focus:outline-none"
                  />
                  <motion.button
                    type="button"
                    onClick={copyToClipboard}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                      copied
                        ? "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
                        : "bg-primary text-primary-foreground"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  The invitation will expire in 7 days. The recipient must have an account with the email <strong>{invitationResult.email}</strong> to accept.
                </p>
              </div>

              {/* Done Button */}
              <motion.button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </div>
          ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <motion.div
                className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-red-900 dark:text-red-100">
                  {error}
                </p>
              </motion.div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-input/50 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                required
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <Shield className="w-4 h-4 inline mr-2" />
                Assign Role
              </label>
              <div className="space-y-2">
                {ROLES.map((roleOption) => (
                  <motion.label
                    key={roleOption.value}
                    className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      role === roleOption.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={roleOption.value}
                      checked={role === roleOption.value}
                      onChange={(e) => setRole(e.target.value)}
                      className="mt-1 w-4 h-4 text-primary"
                    />
                    <div className="flex-1">
                      <div
                        className={`font-semibold ${roleOption.color} mb-1`}
                      >
                        {roleOption.label}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {roleOption.description}
                      </p>
                    </div>
                  </motion.label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <motion.button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-secondary/80 backdrop-blur-sm text-secondary-foreground rounded-xl font-medium hover:bg-secondary transition-all border border-border/50 shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                disabled={isLoading || !email}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                <span className="relative z-10">
                  {isLoading ? "Sending..." : "Send Invitation"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
            </div>
          </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
