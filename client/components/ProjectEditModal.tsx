import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";

interface Logo {
  icon: any;
  name: string;
  color: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  taskCount?: number;
  status?: "active" | "paused" | "completed";
  logo?: string;
}

interface ProjectEditModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => void;
  logoOptions?: Logo[];
}

export default function ProjectEditModal({
  isOpen,
  project,
  onClose,
  onSave,
  logoOptions = [],
}: ProjectEditModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "completed">(
    "active"
  );
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setStatus(project.status || "active");
      setLogo(project.logo || "");
      setError("");
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    if (!description.trim()) {
      setError("Project description is required");
      return;
    }

    if (name.trim().length < 3) {
      setError("Project name must be at least 3 characters");
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      if (project) {
        onSave({
          ...project,
          name: name.trim(),
          description: description.trim(),
          status,
          logo,
        });
      }
      setIsLoading(false);
    }, 500);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Edit Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors text-foreground"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Enter project name"
              className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              placeholder="Enter project description"
              rows={4}
              className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "paused" | "completed")
              }
              className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Project Logo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Project Logo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {logoOptions.map((logoOption) => {
                const LogoIcon = logoOption.icon;
                const isSelected = logo === logoOption.name;
                return (
                  <button
                    key={logoOption.name}
                    type="button"
                    onClick={() => setLogo(logoOption.name)}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    title={logoOption.name}
                  >
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center ${logoOption.color}`}
                    >
                      <LogoIcon className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-muted transition-colors border border-border text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
