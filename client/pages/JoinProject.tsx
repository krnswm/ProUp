import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface InvitationResult {
  message: string;
  project: {
    id: number;
    name: string;
  };
}

export default function JoinProject() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/join-project/${token}`);
      return;
    }

    acceptInvitation();
  }, [token, user, authLoading]);

  const acceptInvitation = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }

    try {
      const response = await api(`/api/projects/join/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
        setProjectName(data.project?.name || "the project");
        setProjectId(data.project?.id);
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to accept invitation");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while accepting the invitation");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Accepting Invitation
              </h1>
              <p className="text-muted-foreground">
                Please wait while we add you to the project...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome to the Team!
              </h1>
              <p className="text-muted-foreground mb-6">
                You have successfully joined <strong>{projectName}</strong>
              </p>
              <div className="flex gap-3">
                <Link
                  to="/projects"
                  className="flex-1 px-4 py-2.5 bg-secondary/80 text-secondary-foreground rounded-xl font-medium hover:bg-secondary transition-all border border-border/50"
                >
                  All Projects
                </Link>
                {projectId && (
                  <Link
                    to={`/project/${projectId}`}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    View Project
                  </Link>
                )}
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Invitation Failed
              </h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex gap-3">
                <Link
                  to="/dashboard"
                  className="flex-1 px-4 py-2.5 bg-secondary/80 text-secondary-foreground rounded-xl font-medium hover:bg-secondary transition-all border border-border/50"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/projects"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  View Projects
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
