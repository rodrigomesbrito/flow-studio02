import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CanvasToolsProvider } from "@/contexts/CanvasToolsContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { CreateNewDialog } from "@/components/CreateNewDialog";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import FilesPage from "./pages/FilesPage";
import ProjectPage from "./pages/ProjectPage";
import CanvasPage from "./pages/CanvasPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { createItem } = useWorkspace();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isCanvasRoute = location.pathname.startsWith('/canvas/');

  const projectMatch = location.pathname.match(/^\/project\/(.+)/);
  const currentParentId = projectMatch ? projectMatch[1] : null;

  const handleCreateCanvas = useCallback(async () => {
    const item = await createItem('canvas', currentParentId);
    navigate(`/canvas/${item.id}`);
  }, [createItem, currentParentId, navigate]);

  const handleCreateProject = useCallback(async () => {
    await createItem('project', currentParentId);
  }, [createItem, currentParentId]);

  if (isCanvasRoute) {
    return (
      <CanvasToolsProvider>
        <AppSidebar />
        <div className="pl-14 h-screen w-screen overflow-hidden">
          <Routes>
            <Route path="/canvas/:canvasId" element={<CanvasPage />} />
          </Routes>
        </div>
      </CanvasToolsProvider>
    );
  }

  return (
    <>
      <WorkspaceSidebar onCreateNew={() => setCreateDialogOpen(true)} />
      <div className="ml-52">
        <Routes>
          <Route path="/" element={<FilesPage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <CreateNewDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateCanvas={handleCreateCanvas}
        onCreateProject={handleCreateProject}
      />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <WorkspaceProvider>
                  <AppLayout />
                </WorkspaceProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
