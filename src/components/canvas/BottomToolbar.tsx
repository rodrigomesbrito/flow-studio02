import { MousePointer, Hand, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Cable } from 'lucide-react';
import { CanvasTool } from '@/types/canvas';

interface BottomToolbarProps {
  zoom: number;
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const toolBtn = (active: boolean) =>
  `w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
    active
      ? 'bg-primary/20 text-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
  }`;

const actionBtn = 'w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors';

export function BottomToolbar({ zoom, activeTool, onToolChange, onZoomIn, onZoomOut, onResetView, onUndo, onRedo }: BottomToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-card/90 backdrop-blur-xl border border-node-border rounded-xl px-2 py-1.5 shadow-2xl">
      <button onClick={() => onToolChange('cursor')} title="Cursor (V)" className={toolBtn(activeTool === 'cursor')}>
        <MousePointer size={16} />
      </button>
      <button onClick={() => onToolChange('hand')} title="Mover (H)" className={toolBtn(activeTool === 'hand')}>
        <Hand size={16} />
      </button>
      <button onClick={() => onToolChange('connect')} title="Conectar (C)" className={toolBtn(activeTool === 'connect')}>
        <Cable size={16} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      <button onClick={onUndo} title="Desfazer (Ctrl+Z)" className={actionBtn}>
        <Undo2 size={16} />
      </button>
      <button onClick={onRedo} title="Refazer (Ctrl+Shift+Z)" className={actionBtn}>
        <Redo2 size={16} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      <button onClick={onZoomOut} className={actionBtn}>
        <ZoomOut size={16} />
      </button>
      <span className="text-xs text-muted-foreground w-12 text-center font-medium tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn} className={actionBtn}>
        <ZoomIn size={16} />
      </button>
      <button onClick={onResetView} title="Resetar vista" className={actionBtn}>
        <Maximize size={16} />
      </button>
    </div>
  );
}
