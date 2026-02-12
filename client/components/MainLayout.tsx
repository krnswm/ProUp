import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, FolderOpen, CalendarDays, ListTodo, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "My Tasks", path: "/my-tasks", icon: ListTodo },
    { label: "Projects", path: "/projects", icon: FolderOpen },
    { label: "Calendar", path: "/calendar", icon: CalendarDays },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? (window.innerWidth < 1024 ? 224 : 256) : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border overflow-hidden z-40 shadow-2xl"
      >
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <motion.div 
            className="p-4 sm:p-5 lg:p-6 border-b border-sidebar-border/50 flex items-center gap-2 bg-gradient-to-r from-sidebar-primary/5 to-transparent"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-sidebar-primary to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-xs sm:text-sm font-bold text-sidebar-primary-foreground">P</span>
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-sidebar-primary to-blue-600 bg-clip-text text-transparent truncate">
                ProUp
              </h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Project Management
              </p>
            </div>
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 p-3 sm:p-4 space-y-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active =
                isActive(item.path) ||
                (item.path === "/projects" && location.pathname.startsWith("/project/"));

              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all group relative overflow-hidden ${
                      active
                        ? "bg-gradient-to-r from-sidebar-primary to-blue-600 text-sidebar-primary-foreground shadow-lg"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/80 backdrop-blur-sm"
                    }`}
                  >
                    {active && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                        layoutId="activeNav"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${
                      active ? "" : "group-hover:scale-110 transition-transform"
                    }`} />
                    <span className="truncate relative z-10">{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Footer */}
          <motion.div 
            className="p-3 sm:p-4 border-t border-sidebar-border/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="p-2 sm:p-3 bg-gradient-to-r from-sidebar-accent to-sidebar-accent/50 rounded-xl text-center backdrop-blur-sm">
              <p className="text-xs text-sidebar-foreground/70 font-medium">
                ProUp v1.0
              </p>
            </div>
          </motion.div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-56 lg:ml-64" : "ml-0"
        }`}
      >
        {/* Navbar */}
        <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 hover:bg-primary/10 rounded-xl transition-all duration-200 text-foreground flex-shrink-0 group"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {sidebarOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5 group-hover:text-primary transition-colors" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5 group-hover:text-primary transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <AnimatePresence>
              {!sidebarOpen && (
                <motion.div 
                  className="flex items-center gap-2 min-w-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-xs font-bold text-primary-foreground">P</span>
                  </div>
                  <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent truncate">
                    ProUp
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button 
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-secondary/80 backdrop-blur-sm rounded-xl min-w-0 hover:bg-primary/10 transition-all duration-200 cursor-pointer border border-border/50 shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                </div>
              </motion.button>
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
