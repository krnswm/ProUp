import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import MainLayout from "@/components/MainLayout";

interface Project {
  id: number;
  name: string;
  description: string;
}

export default function Projects() {
  const [projects] = useState<Project[]>([
    {
      id: 1,
      name: "Website Redesign",
      description: "Complete redesign of the company website with modern UI/UX",
    },
    {
      id: 2,
      name: "Mobile App Development",
      description: "Building a cross-platform mobile app for iOS and Android",
    },
    {
      id: 3,
      name: "API Integration",
      description: "Integration with third-party APIs for enhanced functionality",
    },
    {
      id: 4,
      name: "Performance Optimization",
      description: "Improving app performance and reducing load times",
    },
    {
      id: 5,
      name: "Security Audit",
      description: "Comprehensive security audit and vulnerability assessment",
    },
  ]);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Manage and organize all your projects
            </p>
          </div>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-5 h-5" />
            Create New Project
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-lg p-6 card-shadow hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {project.name}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {project.description}
              </p>

              <div className="flex gap-3">
                <Link
                  to={`/project/${project.id}`}
                  className="flex-1 text-center bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                >
                  View Project
                </Link>
                <button className="flex-1 text-center bg-secondary text-secondary-foreground py-2 rounded-lg font-medium hover:bg-muted transition-colors border border-border text-sm">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
