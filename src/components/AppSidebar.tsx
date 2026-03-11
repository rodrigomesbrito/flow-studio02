import { Home, LayoutGrid, FolderOpen, FileImage, Type, Image } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { NodeType } from '@/types/canvas';

interface AppSidebarProps {
  onAddNode?: (type: NodeType) => void;
}

interface SidebarItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: SidebarItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: LayoutGrid, label: 'Canvas', path: '/canvas' },
  { icon: FolderOpen, label: 'Projetos', path: '/projects' },
  { icon: FileImage, label: 'Arquivos', path: '/files' },
];

const canvasTools: { icon: typeof Type; label: string; type: NodeType }[] = [
  { icon: Type, label: 'Adicionar Texto', type: 'text' },
  { icon: Image, label: 'Adicionar Imagem', type: 'image' },
];

export function AppSidebar({ onAddNode }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isCanvasRoute = location.pathname.startsWith('/canvas');

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center z-50">
      {/* Logo */}
      <div className="w-10 h-10 mt-3 mb-4 rounded-lg bg-primary/20 flex items-center justify-center">
        <span className="text-primary font-bold text-lg">W</span>
      </div>

      {/* Main navigation */}
      <nav className="flex flex-col items-center gap-1 py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);

          return (
            <Tooltip key={path} delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(path)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Canvas tools — only visible inside canvas editor */}
      {isCanvasRoute && onAddNode && (
        <>
          <div className="w-6 h-px bg-sidebar-border my-1" />
          <div className="flex flex-col items-center gap-1">
            {canvasTools.map(({ icon: Icon, label, type }) => (
              <Tooltip key={type} delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAddNode(type)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Icon size={18} strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />
    </aside>
  );
}
