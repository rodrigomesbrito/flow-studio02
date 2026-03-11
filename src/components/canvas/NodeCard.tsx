import { useRef, useState, useCallback } from 'react';
import { MoreHorizontal, Copy, Trash2, GripVertical, Upload } from 'lucide-react';
import { CanvasNode, Position } from '@/types/canvas';

interface NodeCardProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  activeSourceHandleId: string | null;
  highlightedTargetHandleId: string | null;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (nodeId: string, startMouse: Position) => void;
  onPortDragStart: (nodeId: string, portId: string) => void;
}

export function NodeCard({
  node,
  zoom,
  isSelected,
  activeSourceHandleId,
  highlightedTargetHandleId,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onPortDragStart,
}: NodeCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.port-handle') || (e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('input')) return;
    e.stopPropagation();
    onSelect(e);
    onDragStart(node.id, { x: e.clientX, y: e.clientY });
  }, [node.id, onSelect, onDragStart]);

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
          width: Math.max(200, resizeRef.current.startW + dx),
          height: Math.max(120, resizeRef.current.startH + dy),
        }
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

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onPortDragStart(node.id, portId);
  }, [node.id, onPortDragStart]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdate({ imageUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, [onUpdate]);

  const getPortPosition = (side: string): React.CSSProperties => {
    switch (side) {
      case 'left': return { left: -9, top: '50%', transform: 'translateY(-50%)', '--port-hover-transform': 'translateY(-50%) scale(1.18)' } as React.CSSProperties;
      case 'right': return { right: -9, top: '50%', transform: 'translateY(-50%)', '--port-hover-transform': 'translateY(-50%) scale(1.18)' } as React.CSSProperties;
      case 'top': return { top: -9, left: '50%', transform: 'translateX(-50%)', '--port-hover-transform': 'translateX(-50%) scale(1.18)' } as React.CSSProperties;
      case 'bottom': return { bottom: -9, left: '50%', transform: 'translateX(-50%)', '--port-hover-transform': 'translateX(-50%) scale(1.18)' } as React.CSSProperties;
      default: return {};
    }
  };

  return (
    <div
      className={`node-card absolute select-none ${isSelected ? 'selected' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
        zIndex: isSelected ? 100 : 10,
      }}
      onMouseDown={handleMouseDown}
    >
      {node.ports.map((port) => {
        const isSource = activeSourceHandleId === port.id;
        const isHighlighted = highlightedTargetHandleId === port.id;

        return (
          <button
            key={port.id}
            type="button"
            aria-label={`${port.type === 'input' ? 'Entrada' : 'Saída'} do node ${node.title}`}
            className={[
              'port-handle absolute',
              port.type === 'input' ? 'port-input' : 'port-output',
              isSource ? 'is-source' : '',
              isHighlighted ? 'is-highlighted' : '',
            ].filter(Boolean).join(' ')}
            style={getPortPosition(port.side)}
            onMouseDown={(e) => handlePortMouseDown(e, port.id)}
          />
        );
      })}

      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-muted-foreground cursor-grab" />
          <input
            value={node.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="bg-transparent text-sm font-medium text-foreground outline-none w-full"
            placeholder="Título"
          />
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px] z-50">
              <button onClick={() => { onDuplicate(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2">
                <Copy size={14} /> Duplicar
              </button>
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-secondary flex items-center gap-2">
                <Trash2 size={14} /> Deletar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 h-[calc(100%-42px)] overflow-hidden">
        {node.type === 'text' && (
          <textarea
            value={node.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Digite seu texto..."
            className="w-full h-full bg-secondary/50 rounded-lg p-3 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
        )}
        {node.type === 'image' && (
          <div className="h-full flex flex-col">
            {node.imageUrl ? (
              <img src={node.imageUrl} alt="Uploaded" className="w-full flex-1 object-cover rounded-lg" />
            ) : (
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={24} className="text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Upload imagem</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        )}
      </div>

      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/30">
          <path d="M14 14L8 14L14 8Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
