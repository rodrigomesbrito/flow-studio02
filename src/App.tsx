import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CanvasToolsProvider } from "@/contexts/CanvasToolsContext";
import { AppSidebar } from "@/components/AppSidebar";
import HomePage from "./pages/HomePage";
import CanvasPage from "./pages/CanvasPage";
import ProjectsPage from "./pages/ProjectsPage";
import FilesPage from "./pages/FilesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CanvasToolsProvider>
          <AppSidebar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CanvasToolsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
