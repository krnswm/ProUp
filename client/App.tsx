import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MyTasks from "./pages/MyTasks";
import Inbox from "./pages/Inbox";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Calendar from "./pages/Calendar";
import JoinProject from "./pages/JoinProject";
import Whiteboard from "./pages/Whiteboard";
import DocumentEditor from "./pages/DocumentEditor";
import SpreadsheetEditor from "./pages/SpreadsheetEditor";
import NotFound from "./pages/NotFound";
import WeeklyRecap from "./pages/WeeklyRecap";
import Journal from "./pages/Journal";
import Integrations from "./pages/Integrations";
import VirtualPet from "./pages/VirtualPet";
import SprintRetro from "./pages/SprintRetro";
import ProtectedRoute from "@/components/ProtectedRoute";
import AmbientPlayer from "@/components/AmbientPlayer";
import CommandPalette from "@/components/CommandPalette";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            {/* Root route - handles redirect */}
            <Route path="/" element={<Home />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-tasks"
              element={
                <ProtectedRoute>
                  <MyTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <Inbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:projectId/whiteboard"
              element={
                <ProtectedRoute>
                  <Whiteboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:projectId/document/:documentId"
              element={
                <ProtectedRoute>
                  <DocumentEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:projectId/spreadsheet/:documentId"
              element={
                <ProtectedRoute>
                  <SpreadsheetEditor />
                </ProtectedRoute>
              }
            />

            <Route
              path="/weekly-recap"
              element={
                <ProtectedRoute>
                  <WeeklyRecap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journal"
              element={
                <ProtectedRoute>
                  <Journal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pet"
              element={
                <ProtectedRoute>
                  <VirtualPet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/retro"
              element={
                <ProtectedRoute>
                  <SprintRetro />
                </ProtectedRoute>
              }
            />

            {/* Join Project via Invitation */}
            <Route path="/join-project/:token" element={<JoinProject />} />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          <AmbientPlayer />
          <CommandPalette />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
