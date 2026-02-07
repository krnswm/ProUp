import { useState } from "react";
import { Link } from "react-router-dom";
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
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Website Redesign",
      description: "Complete redesign of the company website with modern UI/UX",
      taskCount: 12,
      status: "active",
      logo: "Folder",
    },
    {
      id: 2,
      name: "Mobile App Development",
      description: "Building a cross-platform mobile app for iOS and Android",
      taskCount: 18,
      status: "active",
      logo: "Branch",
    },
    {
      id: 3,
      name: "API Integration",
      description: "Integration with third-party APIs for enhanced functionality",
      taskCount: 8,
      status: "active",
      logo: "Target",
    },
    {
      id: 4,
      name: "Performance Optimization",
      description: "Improving app performance and reducing load times",
      taskCount: 6,
      status: "paused",
      logo: "Zap",
    },
    {
      id: 5,
      name: "Security Audit",
      description: "Comprehensive security audit and vulnerability assessment",
      taskCount: 10,
      status: "completed",
      logo: "Shield",
    },
  ]);

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

  const handleSaveProject = (updatedProject: Project) => {
    setProjects(
      projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    setIsEditModalOpen(false);
    setEditingProject(null);
  };

  const handleCreateProject = (newProject: Omit<Project, "id">) => {
    const project: Project = {
      ...newProject,
      id: Math.max(...projects.map((p) => p.id), 0) + 1,
    };
    setProjects([...projects, project]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteProject = (projectId: number) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter((p) => p.id !== projectId));
    }
  };

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-1 h-6 sm:h-8 bg-primary rounded-full"></div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                  Projects
                </h1>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-4">
                Manage and organize all your projects in one place
              </p>

              {/* Project Stats */}
              <div className="flex items-center gap-4 sm:gap-6">
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
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {completedProjects}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Completed
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center sm:justify-start gap-2 bg-primary text-primary-foreground px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              Create New Project
            </button>
          </div>

          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card border border-border rounded-lg sm:rounded-xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20 flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 line-clamp-2">
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
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${logo.color}`}
                        >
                          <LogoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm mb-5 sm:mb-6 line-clamp-3 flex-grow">
                    {project.description}
                  </p>

                  {/* Divider */}
                  <div className="border-t border-border mb-4 sm:mb-5"></div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      to={`/project/${project.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 sm:py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm group"
                    >
                      <span>View Project</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <button
                      onClick={() => handleEditClick(project)}
                      className="flex-1 px-3 py-2 sm:py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-muted transition-colors border border-border text-sm"
                    >
                      Edit
                    </button>
                  </div>
                </div>
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
                <button className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity mx-auto">
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
      />
    </MainLayout>
  );
}
