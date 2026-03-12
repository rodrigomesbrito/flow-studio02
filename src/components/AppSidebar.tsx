import { Home, Type, Image, ArrowLeft, TextCursorInput, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCanvasTools } from '@/contexts/CanvasToolsContext';
import { NodeType } from '@/types/canvas';

const canvasTools: { icon: typeof Type; label: string; type: NodeType }[] = [
  { icon: Type, label: 'Add Text', type: 'text' },
  { icon: Image, label: 'Add Image', type: 'image' },
  { icon: TextCursorInput, label: 'Texto livre', type: 'freetext' },
  { icon: CheckSquare, label: 'Checklist', type: 'checklist' },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { addNodeHandler } = useCanvasTools();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center z-50">
      {/* Logo */}
      <div className="w-8 h-8 mt-3 mb-1 rounded-lg bg-primary/20 flex items-center justify-center">
        <span className="text-sm font-bold text-primary">W</span>
      </div>

      {/* Back to files */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 mt-3 mb-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Back to files</TooltipContent>
      </Tooltip>

      <div className="w-6 h-px bg-sidebar-border my-1" />

      {/* Canvas tools */}
      {addNodeHandler && (
        <div className="flex flex-col items-center gap-1">
          {canvasTools.map(({ icon: Icon, label, type }) => (
            <Tooltip key={type} delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => addNodeHandler(type)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon size={18} strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      <div className="flex-1" />
    </aside>
  );
}
