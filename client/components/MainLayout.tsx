import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || '{"name":"User"}');

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-lg font-bold text-sidebar-primary">ProUp</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <Link
              to="/dashboard"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive("/dashboard")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/projects"
              className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive("/projects") || location.pathname.startsWith("/project/")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              Projects
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            {!sidebarOpen && (
              <h1 className="text-lg font-bold text-sidebar-primary">ProUp</h1>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-muted transition-colors border border-border text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
