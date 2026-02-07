import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, FolderOpen, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { setTheme } = useTheme();

  const user = JSON.parse(localStorage.getItem("user") || '{"name":"User"}');

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", path: "/projects", icon: FolderOpen },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-56 lg:w-64" : "w-0"
        } fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden z-40`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-sidebar-border flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs sm:text-sm font-bold text-sidebar-primary-foreground">P</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-sidebar-primary truncate">
                ProUp
              </h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Project Management
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                isActive(item.path) ||
                (item.path === "/projects" && location.pathname.startsWith("/project/"));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-sidebar-border">
            <div className="p-2 sm:p-3 bg-sidebar-accent rounded-lg text-center">
              <p className="text-xs text-sidebar-foreground/70 font-medium">
                ProUp v1.0
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-56 lg:ml-64" : "ml-0"
        }`}
      >
        {/* Navbar */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors text-foreground flex-shrink-0"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            {!sidebarOpen && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-foreground">P</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-primary truncate">
                  ProUp
                </h1>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-secondary rounded-lg min-w-0 hover:bg-muted transition-colors cursor-pointer">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Theme Options */}
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4" />
                <span>Light Theme</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark Theme</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>System Theme</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Logout */}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
