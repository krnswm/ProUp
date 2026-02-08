import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Tldraw, Editor, TLStoreSnapshot, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Users, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWhiteboardSocket, RemoteCursor } from "@/hooks/useWhiteboardSocket";

interface Project {
  id: number;
  name: string;
}

export default function Whiteboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editorRef = useRef<Editor | null>(null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  // Socket connection
  const {
    isConnected,
    users,
    remoteCursors,
    emitCanvasChange,
    emitCursorMove,
  } = useWhiteboardSocket({
    projectId: projectId || "",
    userName: user?.name || "Anonymous",
    onCanvasChange: (change) => {
      // Apply changes from other users
      if (editorRef.current && change) {
        try {
          // This is a simplified approach - in production you'd want more sophisticated sync
          console.log("Received canvas change:", change);
        } catch (error) {
          console.error("Error applying canvas change:", error);
        }
      }
    },
  });

  // Fetch project info
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      try {
        const response = await api(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      }
    };
    fetchProject();
  }, [projectId]);

  // Load whiteboard state
  useEffect(() => {
    const loadWhiteboard = async () => {
      if (!projectId) return;
      try {
        setIsLoading(true);
        const response = await api(`/api/whiteboard/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data !== "{}") {
            try {
              const parsed = JSON.parse(data.data);
              setInitialData(parsed);
            } catch (e) {
              console.log("No previous whiteboard state");
            }
          }
        }
      } catch (error) {
        console.error("Error loading whiteboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadWhiteboard();
  }, [projectId]);

  // Handle editor mount
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Load initial data if available
    if (initialData) {
      try {
        loadSnapshot(editor.store, initialData);
      } catch (error) {
        console.error("Error loading snapshot:", error);
      }
    }

    // Track pointer movement for remote cursors
    const handlePointerMove = () => {
      const point = editor.inputs.currentPagePoint;
      emitCursorMove(point.x, point.y);
    };

    // Track changes for real-time sync
    const unsubscribe = editor.store.listen((entry) => {
      // Emit changes to other users
      emitCanvasChange(entry);
    });

    editor.on("pointer-move" as any, handlePointerMove);

    return () => {
      unsubscribe();
    };
  }, [initialData, emitCanvasChange, emitCursorMove]);

  // Save whiteboard
  const handleSave = useCallback(async () => {
    if (!editorRef.current || !projectId) {
      console.log("Cannot save: missing editor or projectId");
      return;
    }
    
    setIsSaving(true);
    try {
      // Use tldraw v4 getSnapshot function
      const { document, session } = getSnapshot(editorRef.current.store);
      console.log("Saving whiteboard snapshot for project:", projectId);
      
      const response = await api(`/api/whiteboard/${projectId}`, {
        method: "POST",
        body: JSON.stringify({ data: { document, session } }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Whiteboard saved successfully:", result);
        setLastSaved(new Date());
      } else {
        const error = await response.text();
        console.error("Failed to save whiteboard. Status:", response.status, "Error:", error);
        alert(`Failed to save whiteboard: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.error("Error saving whiteboard:", error);
      alert(`Error saving whiteboard: ${error}`);
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (editorRef.current) {
        handleSave();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [handleSave]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <Link
            to={`/project/${projectId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Project</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold text-foreground">
            {project?.name || "Whiteboard"}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-600 hidden sm:inline">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-red-600 hidden sm:inline">Disconnected</span>
              </>
            )}
          </div>

          {/* Active Users */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {users.slice(0, 5).map((u) => (
                <div
                  key={u.socketId}
                  className="w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: u.color }}
                  title={u.userName}
                >
                  {u.userName.charAt(0).toUpperCase()}
                </div>
              ))}
              {users.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium">
                  +{users.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Save</span>
          </motion.button>
        </div>
      </header>

      {/* Whiteboard Canvas */}
      <div className="flex-1 relative">
        <Tldraw
          onMount={handleMount}
          autoFocus
        />

        {/* Remote Cursors Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {remoteCursors.map((cursor) => (
            <div
              key={cursor.socketId}
              className="absolute transition-all duration-75 ease-out"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Cursor */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={cursor.color}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
              >
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.94 2.96a.5.5 0 0 0-.44.25Z" />
              </svg>
              {/* Name Label */}
              <div
                className="absolute left-4 top-4 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.userName}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-border bg-card/50 flex items-center justify-between px-4 text-xs text-muted-foreground">
        <div>
          {users.length} user{users.length !== 1 ? "s" : ""} online
        </div>
        {lastSaved && (
          <div>
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
