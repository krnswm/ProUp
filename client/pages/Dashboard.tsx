import MainLayout from "@/components/MainLayout";

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

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's your project overview.</p>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Projects Card */}
          <div className="bg-card border border-border rounded-lg p-6 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Projects</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.totalProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
            </div>
          </div>

          {/* Total Tasks Card */}
          <div className="bg-card border border-border rounded-lg p-6 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Tasks</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.totalTasks}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            </div>
          </div>

          {/* Completed Tasks Card */}
          <div className="bg-card border border-border rounded-lg p-6 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Completed Tasks</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {stats.completedTasks}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
            </div>
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-card border border-border rounded-lg p-6 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Pending Tasks</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {stats.pendingTasks}
                </p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-card border border-border rounded-lg p-6 card-shadow">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Overall Task Completion</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <div className="mt-4 text-right">
            <p className="text-sm font-semibold text-primary">
              {completionPercentage}% Complete
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
