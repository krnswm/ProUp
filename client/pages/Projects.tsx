import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  FolderOpen,
  ArrowRight,
  Trash2,
  GitBranch,
  Target,
  Shield,
  Zap,
  Lock,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import ProjectEditModal from "@/components/ProjectEditModal";
import ProjectCreateModal from "@/components/ProjectCreateModal";
import { api } from "@/lib/api";

interface Project {
  id: number;
  name: string;
  description: string;
  taskCount?: number;
  status?: "active" | "paused" | "completed";
  logo?: string;
}

const LOGO_OPTIONS = [
  { icon: FolderOpen, name: "Folder", color: "bg-blue-50 text-blue-600" },
  { icon: GitBranch, name: "Branch", color: "bg-purple-50 text-purple-600" },
  { icon: Target, name: "Target", color: "bg-orange-50 text-orange-600" },
  { icon: Zap, name: "Flash", color: "bg-yellow-50 text-yellow-600" },
  { icon: Shield, name: "Shield", color: "bg-red-50 text-red-600" },
  { icon: Lock, name: "Lock", color: "bg-green-50 text-green-600" },
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchProjects();

    // Poll for updates every 5 seconds for real-time task count updates
    const interval = setInterval(fetchProjects, 5000);

    // Also refetch when window gains focus
    const handleFocus = () => {
      fetchProjects();
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "paused":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "paused":
        return "Paused";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getLogoIcon = (logoName?: string) => {
    const logo = LOGO_OPTIONS.find((l) => l.name === logoName);
    return logo || LOGO_OPTIONS[0];
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleSaveProject = async (updatedProject: Project) => {
    try {
      const response = await api(`/api/projects/${updatedProject.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProject),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setProjects(
          projects.map((p) => (p.id === updated.id ? updated : p))
        );
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
    setIsEditModalOpen(false);
    setEditingProject(null);
  };

  const handleCreateProject = async (newProject: Omit<Project, "id">) => {
    try {
      const response = await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProject),
      });
      
      if (response.ok) {
        const created = await response.json();
        setProjects([...projects, created]);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
    setIsCreateModalOpen(false);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        const response = await api(`/api/projects/${projectId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setProjects(projects.filter((p) => p.id !== projectId));
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const pausedProjects = projects.filter((p) => p.status === "paused").length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <motion.div 
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <motion.div 
                  className="w-1 h-6 sm:h-8 bg-gradient-to-b from-primary to-purple-600 rounded-full shadow-lg"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">
                  Projects
                </h1>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-4">
                Manage and organize all your projects in one place
              </p>

              {/* Project Stats */}
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {projects.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Projects
                  </p>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">
                    {activeProjects}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active
                  </p>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                    {pausedProjects}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paused
                  </p>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {completedProjects}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Completed
                  </p>
                </div>
              </div>
            </div>
            <motion.button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center sm:justify-start gap-2 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all whitespace-nowrap flex-shrink-0 group relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Plus className="w-5 h-5 flex-shrink-0 group-hover:rotate-90 transition-transform duration-300" />
                Create New Project
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </motion.div>

          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  className="group relative bg-card/80 backdrop-blur-sm border border-border rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:border-primary/30 flex flex-col overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Card Header */}
                  <div className="relative z-10 flex items-start justify-between gap-3 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {project.status && (
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                              project.status
                            )}`}
                          >
                            {getStatusLabel(project.status)}
                          </span>
                        )}
                        {project.taskCount && (
                          <span className="text-xs text-muted-foreground">
                            {project.taskCount} tasks
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Project Logo */}
                    {(() => {
                      const logo = getLogoIcon(project.logo);
                      const LogoIcon = logo.icon;
                      return (
                        <motion.div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${logo.color}`}
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LogoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </motion.div>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  <p className="relative z-10 text-muted-foreground text-sm mb-5 sm:mb-6 line-clamp-3 flex-grow">
                    {project.description}
                  </p>

                  {/* Divider */}
                  <div className="relative z-10 border-t border-border/50 mb-4 sm:mb-5"></div>

                  {/* Action Buttons */}
                  <div className="relative z-10 flex gap-2 sm:gap-3">
                    <Link
                      to={`/project/${project.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground py-2 sm:py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all text-sm group relative overflow-hidden"
                    >
                      <span className="relative z-10">View</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                    <motion.button
                      onClick={() => handleEditClick(project)}
                      className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 bg-secondary/80 backdrop-blur-sm text-secondary-foreground rounded-xl font-medium hover:bg-primary/10 transition-all border border-border/50 text-sm shadow-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Edit
                    </motion.button>
                    <motion.button
                      onClick={() => handleDeleteProject(project.id)}
                      className="px-2 sm:px-3 py-2 sm:py-2.5 bg-red-50/80 dark:bg-red-950/30 backdrop-blur-sm text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition-all border border-red-200 dark:border-red-800 text-sm flex items-center justify-center shadow-sm"
                      title="Delete project"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No projects yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first project
                </p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create New Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Project Modal */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        project={editingProject}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        logoOptions={LOGO_OPTIONS}
      />

      {/* Create Project Modal */}
      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
        logoOptions={LOGO_OPTIONS}
      />
    </MainLayout>
  );
}
