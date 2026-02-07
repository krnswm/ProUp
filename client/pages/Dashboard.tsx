import MainLayout from "@/components/MainLayout";
import { Folder, CheckCircle, Clock, ListTodo, TrendingUp } from "lucide-react";

export default function Dashboard() {
  // Sample data
  const stats = {
    totalProjects: 5,
    totalTasks: 24,
    completedTasks: 8,
    pendingTasks: 16,
  };

  const completionPercentage = Math.round(
    (stats.completedTasks / stats.totalTasks) * 100
  );

  const summaryCards = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: Folder,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      title: "Total Tasks",
      value: stats.totalTasks,
      icon: ListTodo,
      color: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-200",
    },
    {
      title: "Completed Tasks",
      value: stats.completedTasks,
      icon: CheckCircle,
      color: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: Clock,
      color: "bg-orange-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200",
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-primary rounded-full"></div>
              <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Welcome back! Here's your project overview at a glance.
            </p>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium mb-1">
                        {card.title}
                      </p>
                      <p className="text-4xl font-bold text-foreground">
                        {card.value}
                      </p>
                    </div>
                    <div className={`${card.color} p-3 rounded-lg border ${card.borderColor}`}>
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {index === 0 && "Active projects"}
                      {index === 1 && "Total workload"}
                      {index === 2 && "Well done!"}
                      {index === 3 && "In progress"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Section */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">
                    Task Completion Progress
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  {stats.completedTasks} of {stats.totalTasks} tasks completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-primary">
                  {completionPercentage}%
                </div>
                <p className="text-muted-foreground text-sm mt-1">Complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-4">
              <div className="w-full bg-secondary rounded-full h-4 overflow-hidden border border-border">
                <div
                  className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500 ease-out shadow-md"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Progress Labels */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-2xl font-bold text-primary">
                    {stats.completedTasks}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.pendingTasks}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg border border-border">
                  <p className="text-2xl font-bold text-foreground">
                    {Math.ceil((stats.pendingTasks / stats.totalTasks) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Remaining</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">
                  Completion Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {completionPercentage}%
                  </span>
                  <span className="text-sm text-green-600">
                    ↑ On track
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">
                  Avg. Tasks per Project
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {(stats.totalTasks / stats.totalProjects).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-2">
                  Productivity Index
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: "72%" }}
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground">72%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
