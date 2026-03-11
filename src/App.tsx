import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CanvasToolsProvider } from "@/contexts/CanvasToolsContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { CreateNewDialog } from "@/components/CreateNewDialog";
import { AppSidebar } from "@/components/AppSidebar";
import FilesPage from "./pages/FilesPage";
import ProjectPage from "./pages/ProjectPage";
import CanvasPage from "./pages/CanvasPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { createItem } = useWorkspace();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isCanvasRoute = location.pathname.startsWith('/canvas/');

  // Determine current parent for creating items
  const projectMatch = location.pathname.match(/^\/project\/(.+)/);
  const currentParentId = projectMatch ? projectMatch[1] : null;

  const handleCreateCanvas = useCallback(() => {
    const item = createItem('canvas', currentParentId);
    navigate(`/canvas/${item.id}`);
  }, [createItem, currentParentId, navigate]);

  const handleCreateProject = useCallback(() => {
    createItem('project', currentParentId);
  }, [createItem, currentParentId]);

  if (isCanvasRoute) {
    return (
      <CanvasToolsProvider>
        <div className="flex h-screen w-screen overflow-hidden">
          <AppSidebar />
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/canvas/:canvasId" element={<CanvasPage />} />
            </Routes>
          </div>
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
        <WorkspaceProvider>
          <AppLayout />
        </WorkspaceProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
