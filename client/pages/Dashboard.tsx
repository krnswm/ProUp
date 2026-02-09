import MainLayout from "@/components/MainLayout";
import { Folder, CheckCircle, Clock, ListTodo, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface DashboardAnalytics {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  avgTasksPerProject: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardAnalytics>({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    completionRate: 0,
    avgTasksPerProject: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api('/api/dashboard/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard analytics');
        }
        const data = await response.json();
        setStats(data);
        setError(null); // Clear any previous errors
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchAnalytics();

    // Set up polling to refresh data every 10 seconds
    const interval = setInterval(fetchAnalytics, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const completionPercentage = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const productivityIndex = stats.totalTasks > 0
    ? Math.round(((stats.completedTasks + stats.inProgressTasks) / stats.totalTasks) * 100)
    : 0;

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load dashboard</p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <motion.div 
            className="mb-8 sm:mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <motion.div 
                className="w-1 h-6 sm:h-8 bg-gradient-to-b from-primary via-blue-500 to-purple-600 rounded-full shadow-lg"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Welcome back! Here's your project overview at a glance.
            </p>
          </motion.div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 sm:mb-10">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="group relative bg-card/80 backdrop-blur-sm border border-border rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-2xl transition-all duration-300 hover:border-primary/30 overflow-hidden"
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-2 truncate">
                          {card.title}
                        </p>
                        <motion.p 
                          key={card.value}
                          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground"
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                        >
                          {card.value}
                        </motion.p>
                      </div>
                      <motion.div 
                        className={`flex-shrink-0 ${card.color} p-2 sm:p-3 rounded-xl border ${card.borderColor} shadow-sm group-hover:shadow-md transition-shadow`}
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 flex-shrink-0 ${card.iconColor}`} />
                      </motion.div>
                    </div>
                    <div className="pt-3 sm:pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground font-medium">
                        {index === 0 && "Active projects"}
                        {index === 1 && "Total workload"}
                        {index === 2 && "Well done!"}
                        {index === 3 && "In progress"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Progress Section */}
          <motion.div 
            className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
            {/* Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  </motion.div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Task Completion Progress
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.completedTasks} of {stats.totalTasks} tasks completed
                </p>
              </div>
              <div className="text-left sm:text-right">
                <motion.div 
                  key={completionPercentage}
                  className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6, type: "spring" }}
                >
                  {completionPercentage}%
                </motion.div>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative z-10 space-y-4">
              <div className="w-full bg-secondary/50 backdrop-blur-sm rounded-full h-3 sm:h-4 overflow-hidden border border-border shadow-inner">
                <motion.div
                  className="relative h-full rounded-full overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-purple-600 shadow-lg" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
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
                    {stats.totalTasks > 0 ? Math.ceil((stats.pendingTasks / stats.totalTasks) * 100) : 0}%
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
                  {stats.avgTasksPerProject.toFixed(1)}
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
                      style={{ width: `${productivityIndex}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-foreground flex-shrink-0">
                    {productivityIndex}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
