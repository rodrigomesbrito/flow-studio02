import { useRef, useState, useCallback } from 'react';
import { CanvasNode, Position } from '@/types/canvas';
import { GripVertical, Lock } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface FrameNodeProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, startMouse: Position, altKey?: boolean) => void;
}

export function FrameNode({
  node,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
}: FrameNodeProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const isLocked = node.locked ?? false;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle') || target.closest('input') || target.closest('button')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / zoom;
    if (relativeY > 40) return;

    e.stopPropagation();
    onSelect(e);
    if (!isLocked) {
      onDragStart(node.id, { x: e.clientX, y: e.clientY }, e.altKey);
    }
  }, [node.id, onSelect, onDragStart, zoom, isLocked]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: node.size.width, startH: node.size.height };

    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = (ev.clientX - resizeRef.current.startX) / zoom;
      const dy = (ev.clientY - resizeRef.current.startY) / zoom;
      onUpdate({
        size: {
          width: Math.max(300, resizeRef.current.startW + dx),
          height: Math.max(200, resizeRef.current.startH + dy),
        },
      });
    };

    const handleUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [node.size, onUpdate, zoom, isLocked]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute select-none frame-node ${isSelected ? 'frame-selected' : ''}`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: node.size.width,
            height: node.size.height,
            zIndex: isSelected ? 5 : 1,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Frame background */}
          <div className={`absolute inset-0 rounded-xl border pointer-events-none ${isLocked ? 'border-border/40 border-dashed' : 'border-border/40'}`}
            style={{ background: 'hsl(240 6% 11% / 0.6)' }}
          />

          {/* Lock indicator */}
          {isLocked && (
            <div className="absolute top-2 right-2 z-10">
              <Lock size={12} className="text-muted-foreground/60" />
            </div>
          )}

          {/* Header */}
          <div className={`relative flex items-center gap-2 px-3 py-2 ${isLocked ? 'cursor-not-allowed' : 'cursor-grab'}`}>
            <GripVertical size={14} className="text-muted-foreground/50 shrink-0" />
            {editingTitle && !isLocked ? (
              <input
                autoFocus
                value={node.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                className="bg-transparent text-sm font-semibold text-muted-foreground outline-none flex-1"
              />
            ) : (
              <span
                className="text-sm font-semibold text-muted-foreground/70 cursor-text truncate"
                onDoubleClick={() => !isLocked && setEditingTitle(true)}
              >
                {node.title || 'Frame'}
              </span>
            )}
          </div>

          {/* Dashed separator */}
          <div className="relative mx-3">
            <div className="border-t border-dashed border-border/30" />
          </div>

          {/* Resize handle */}
          {!isLocked && (
            <div
              className="resize-handle absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
              onMouseDown={handleResizeStart}
            >
              <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/20">
                <path d="M14 14L8 14L14 8Z" fill="currentColor" />
              </svg>
            </div>
          )}

          {/* Corner resize indicators when selected */}
          {isSelected && (
            <>
              <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-primary/40 -translate-x-1 -translate-y-1 pointer-events-none" />
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary/40 translate-x-1 -translate-y-1 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-primary/40 -translate-x-1 translate-y-1 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary/40 translate-x-1 translate-y-1 pointer-events-none" />
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40 bg-card/95 backdrop-blur-xl border-border">
        <ContextMenuItem
          onClick={() => onUpdate({ locked: !isLocked })}
          className="gap-2 text-foreground"
        >
          <Lock size={14} className="text-muted-foreground" />
          {isLocked ? 'Desbloquear' : 'Bloquear'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive">
          Apagar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
