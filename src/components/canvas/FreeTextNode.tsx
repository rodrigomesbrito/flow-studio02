import { useRef, useState, useCallback } from 'react';
import { CanvasNode, Position } from '@/types/canvas';
import { Trash2 } from 'lucide-react';

interface FreeTextNodeProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, startMouse: Position) => void;
}

export function FreeTextNode({
  node,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
}: FreeTextNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.stopPropagation();
    onSelect();
    if (!isEditing) {
      onDragStart(node.id, { x: e.clientX, y: e.clientY });
    }
  }, [node.id, onSelect, onDragStart, isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: node.size.width, startH: node.size.height };

    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = (ev.clientX - resizeRef.current.startX) / zoom;
      const dy = (ev.clientY - resizeRef.current.startY) / zoom;
      onUpdate({
        size: {
          width: Math.max(80, resizeRef.current.startW + dx),
          height: Math.max(32, resizeRef.current.startH + dy),
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
  }, [node.size, onUpdate, zoom]);

  return (
    <div
      className="absolute select-none group"
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: isSelected ? 100 : 10,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Selection border */}
      <div
        className={`absolute inset-0 rounded-lg pointer-events-none transition-all duration-150 ${
          isSelected
            ? 'border border-primary/50 bg-primary/[0.03]'
            : 'border border-transparent hover:border-muted-foreground/20'
        }`}
      />

      {/* Delete button */}
      {showDelete && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center z-50 shadow-lg hover:scale-110 transition-transform"
        >
          <Trash2 size={12} />
        </button>
      )}

      {isEditing ? (
        <textarea
          autoFocus
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          onBlur={handleBlur}
          className="w-full h-full bg-transparent text-foreground resize-none outline-none p-2 rounded-lg"
          style={{ fontSize: node.size.height < 60 ? '14px' : '16px' }}
        />
      ) : (
        <div
          className="w-full h-full p-2 text-foreground whitespace-pre-wrap break-words overflow-hidden cursor-default"
          style={{ fontSize: node.size.height < 60 ? '14px' : '16px' }}
        >
          {node.content || (
            <span className="text-muted-foreground/50 italic">Duplo clique para editar...</span>
          )}
        </div>
      )}

      {/* Resize handle */}
      {isSelected && (
        <div
          className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/40">
            <path d="M14 14L8 14L14 8Z" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}
