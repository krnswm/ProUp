import { useState, useEffect } from "react";
import { Users, UserPlus, Crown, Shield, Eye, MoreVertical, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import InviteMemberModal from "./InviteMemberModal";

interface Member {
  id: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface ProjectMembersTabProps {
  projectId: number;
  projectName: string;
  currentUserRole?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case "Owner":
      return <Crown className="w-4 h-4" />;
    case "Admin":
      return <Shield className="w-4 h-4" />;
    case "Member":
      return <Users className="w-4 h-4" />;
    case "Viewer":
      return <Eye className="w-4 h-4" />;
    default:
      return <Users className="w-4 h-4" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case "Owner":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    case "Admin":
      return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "Member":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "Viewer":
      return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  }
};

export default function ProjectMembersTab({
  projectId,
  projectName,
  currentUserRole = "Viewer",
}: ProjectMembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [error, setError] = useState("");

  const canInvite = currentUserRole === "Owner" || currentUserRole === "Admin";
  const canManageMembers = currentUserRole === "Owner" || currentUserRole === "Admin";

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/members`);
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (email: string, role: string) => {
    const response = await fetch(`/api/projects/${projectId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send invitation");
    }

    // Show success message
    alert("Invitation sent successfully!");
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to remove member");

      // Refresh members list
      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  const handleUpdateRole = async (memberId: number, newRole: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) throw new Error("Failed to update role");

      // Refresh members list
      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team Members
            <span className="text-muted-foreground text-base font-normal">
              ({members.length})
            </span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to this project
          </p>
        </div>

        {canInvite && (
          <motion.button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground px-4 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <UserPlus className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="relative z-10">Invite Member</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            className="group relative bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                {member.user.name.charAt(0).toUpperCase()}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">
                    {member.user.name}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(
                      member.role
                    )}`}
                  >
                    {getRoleIcon(member.role)}
                    {member.role}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {member.user.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              {canManageMembers && member.role !== "Owner" && (
                <div className="flex items-center gap-2">
                  {/* Role Selector */}
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg bg-input/50 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                    <option value="Viewer">Viewer</option>
                  </select>

                  {/* Remove Button */}
                  <motion.button
                    onClick={() => handleRemoveMember(member.id, member.user.name)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors text-muted-foreground hover:text-red-600"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {members.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-foreground mb-2">
            No team members yet
          </h4>
          <p className="text-muted-foreground mb-4">
            Invite people to collaborate on this project
          </p>
          {canInvite && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" />
              Invite Your First Member
            </button>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        projectId={projectId}
        projectName={projectName}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
