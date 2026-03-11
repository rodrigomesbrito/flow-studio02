import { useRef, useState, useCallback, useEffect } from 'react';
import { CanvasNode, Position, TextStyle } from '@/types/canvas';
import { Trash2, Bold, Italic, CaseSensitive, Plus, Minus } from 'lucide-react';

interface FreeTextNodeProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  autoEdit?: boolean;
  onAutoEditConsumed?: () => void;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, startMouse: Position, altKey?: boolean) => void;
}

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 16,
  bold: false,
  italic: false,
  uppercase: false,
};

export function FreeTextNode({
  node,
  zoom,
  isSelected,
  autoEdit,
  onAutoEditConsumed,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
}: FreeTextNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const style = { ...DEFAULT_TEXT_STYLE, ...node.textStyle };

  const updateStyle = useCallback((updates: Partial<TextStyle>) => {
    onUpdate({ textStyle: { ...style, ...updates } });
  }, [onUpdate, style]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('.freetext-toolbar')) return;
    e.stopPropagation();
    onSelect(e);
    if (!isEditing) {
      onDragStart(node.id, { x: e.clientX, y: e.clientY }, e.altKey);
    }
  }, [node.id, onSelect, onDragStart, isEditing]);

  // Auto-edit when created via double-click
  useEffect(() => {
    if (autoEdit) {
      setIsEditing(true);
      onAutoEditConsumed?.();
    }
  }, [autoEdit, onAutoEditConsumed]);

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

  const textContentStyle: React.CSSProperties = {
    fontSize: `${style.fontSize}px`,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textTransform: style.uppercase ? 'uppercase' : 'none',
  };

  const displayContent = node.content || '';

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
    >
      {/* Selection border */}
      <div
        className={`absolute inset-0 rounded-lg pointer-events-none transition-all duration-150 ${
          isSelected
            ? 'border border-primary/50 bg-primary/[0.03]'
            : 'border border-transparent hover:border-muted-foreground/20'
        }`}
      />

      {/* Formatting toolbar — shown when selected */}
      {isSelected && (
        <div
          className="freetext-toolbar absolute left-0 right-0 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-popover border border-border shadow-lg"
          style={{ bottom: '100%', marginBottom: 6, width: 'fit-content' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Font size controls */}
          <button
            onClick={() => updateStyle({ fontSize: Math.max(8, style.fontSize - 2) })}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Diminuir texto"
          >
            <Minus size={12} />
          </button>
          <span className="text-[10px] text-muted-foreground w-6 text-center tabular-nums">{style.fontSize}</span>
          <button
            onClick={() => updateStyle({ fontSize: Math.min(120, style.fontSize + 2) })}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Aumentar texto"
          >
            <Plus size={12} />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Bold */}
          <button
            onClick={() => updateStyle({ bold: !style.bold })}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              style.bold ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            title="Negrito"
          >
            <Bold size={13} />
          </button>

          {/* Italic */}
          <button
            onClick={() => updateStyle({ italic: !style.italic })}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              style.italic ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            title="Itálico"
          >
            <Italic size={13} />
          </button>

          {/* Uppercase */}
          <button
            onClick={() => updateStyle({ uppercase: !style.uppercase })}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              style.uppercase ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            title="Maiúsculas"
          >
            <CaseSensitive size={13} />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {isEditing ? (
        <textarea
          autoFocus
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          onBlur={handleBlur}
          className="w-full h-full bg-transparent text-foreground resize-none outline-none p-2 rounded-lg"
          style={textContentStyle}
        />
      ) : (
        <div
          className="w-full h-full p-2 text-foreground whitespace-pre-wrap break-words overflow-hidden cursor-default"
          style={textContentStyle}
        >
          {displayContent || (
            <span className="text-muted-foreground/50 italic" style={{ textTransform: 'none', fontWeight: 400, fontStyle: 'italic' }}>
              Duplo clique para editar...
            </span>
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
