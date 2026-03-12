import { FolderOpen, Plus, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface WorkspaceSidebarProps {
  onCreateNew: () => void;
}

export function WorkspaceSidebar({ onCreateNew }: WorkspaceSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const isFilesRoute = location.pathname === '/' || location.pathname.startsWith('/project/');

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-52 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">W</span>
        </div>
        <span className="text-foreground font-semibold text-sm">Workspace</span>
      </div>

      {/* Create button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          <Plus size={16} />
          Create New File
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 pt-2">
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isFilesRoute
              ? 'text-foreground bg-secondary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <FolderOpen size={16} />
          <span>My Files</span>
          <Plus
            size={14}
            className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onCreateNew();
            }}
          />
        </button>
      </nav>

      <div className="flex-1" />

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={() => signOut().then(() => navigate('/login'))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
