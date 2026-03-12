import { Search, Clock, FolderOpen, FileEdit, Layers, GitBranch, Settings, HelpCircle, MessageCircle, Type, Image, TextCursorInput, CheckSquare } from 'lucide-react';
import { NodeType } from '@/types/canvas';

interface CanvasSidebarProps {
  onAddNode: (type: NodeType) => void;
}

const navIcons = [
  { icon: Search, label: 'Buscar' },
  { icon: Clock, label: 'Recentes' },
  { icon: FolderOpen, label: 'Projetos' },
  { icon: FileEdit, label: 'Editor' },
  { icon: Layers, label: 'Camadas' },
  { icon: GitBranch, label: 'Fluxos' },
  { icon: Settings, label: 'Config' },
];

const nodeButtons: { icon: typeof Type; label: string; type: NodeType }[] = [
  { icon: Type, label: 'Texto', type: 'text' },
  { icon: Image, label: 'Imagem', type: 'image' },
  { icon: TextCursorInput, label: 'Texto livre', type: 'freetext' },
  { icon: CheckSquare, label: 'Checklist', type: 'checklist' },
];

export function CanvasSidebar({ onAddNode }: CanvasSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center z-50">
      {/* Logo */}
      <div className="w-10 h-10 mt-3 mb-4 rounded-lg bg-primary/20 flex items-center justify-center">
        <span className="text-primary font-bold text-lg">W</span>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-2">
        {navIcons.map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        ))}

        {/* Separator */}
        <div className="w-6 h-px bg-sidebar-border my-3" />

        {/* Add node buttons */}
        {nodeButtons.map(({ icon: Icon, label, type }) => (
          <button
            key={type}
            title={`Adicionar ${label}`}
            onClick={() => onAddNode(type)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        ))}
      </nav>

      {/* Bottom icons */}
      <div className="flex flex-col items-center gap-1 pb-4">
        <button title="Ajuda" className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
          <HelpCircle size={18} strokeWidth={1.5} />
        </button>
        <button title="Chat" className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
          <MessageCircle size={18} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
