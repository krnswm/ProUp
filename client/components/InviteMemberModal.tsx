import { useState } from "react";
import { X, Mail, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InviteMemberModalProps {
  isOpen: boolean;
  projectId: number;
  projectName: string;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onInvite(email, role);
      setEmail("");
      setRole("Viewer");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
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
          onClick={onClose}
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
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Invite Team Member
                </h2>
                <p className="text-sm text-muted-foreground">
                  to {projectName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
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
                onClick={onClose}
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
