import { MousePointer, Hand, Undo2, Redo2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface BottomToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function BottomToolbar({ zoom, onZoomIn, onZoomOut, onResetView, onUndo, onRedo }: BottomToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-card/90 backdrop-blur-xl border border-node-border rounded-xl px-2 py-1.5 shadow-2xl">
      {/* Tools */}
      <button className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/20 text-primary transition-colors">
        <MousePointer size={16} />
      </button>
      <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Hand size={16} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo / Redo */}
      <button onClick={onUndo} title="Desfazer" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Undo2 size={16} />
      </button>
      <button onClick={onRedo} title="Refazer" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Redo2 size={16} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Zoom */}
      <button onClick={onZoomOut} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <ZoomOut size={16} />
      </button>
      <span className="text-xs text-muted-foreground w-12 text-center font-medium tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <ZoomIn size={16} />
      </button>
      <button onClick={onResetView} title="Resetar vista" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Maximize size={16} />
      </button>
    </div>
  );
}
