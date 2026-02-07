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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-1 h-6 sm:h-8 bg-primary rounded-full"></div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Welcome back! Here's your project overview at a glance.
            </p>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 sm:mb-10">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1 truncate">
                        {card.title}
                      </p>
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                        {card.value}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 ${card.color} p-2 sm:p-3 rounded-lg border ${card.borderColor}`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 flex-shrink-0 ${card.iconColor}" />
                    </div>
                  </div>
                  <div className="pt-3 sm:pt-4 border-t border-border">
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
          <div className="bg-card border border-border rounded-lg sm:rounded-xl p-5 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    Task Completion Progress
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.completedTasks} of {stats.totalTasks} tasks completed
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-4xl sm:text-5xl font-bold text-primary">
                  {completionPercentage}%
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-4">
              <div className="w-full bg-secondary rounded-full h-3 sm:h-4 overflow-hidden border border-border">
                <div
                  className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500 ease-out shadow-md"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Progress Labels */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 sm:pt-4">
                <div className="text-center p-2 sm:p-3 lg:p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xl sm:text-2xl font-bold text-primary">
                    {stats.completedTasks}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </div>
                <div className="text-center p-2 sm:p-3 lg:p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {stats.pendingTasks}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="text-center p-2 sm:p-3 lg:p-4 bg-secondary rounded-lg border border-border">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {Math.ceil((stats.pendingTasks / stats.totalTasks) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Remaining</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-2">
                  Completion Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {completionPercentage}%
                  </span>
                  <span className="text-xs text-green-600">
                    ↑ On track
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-2">
                  Avg. Tasks per Project
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {(stats.totalTasks / stats.totalProjects).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-2">
                  Productivity Index
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden min-w-0">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: "72%" }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-foreground flex-shrink-0">
                    72%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
