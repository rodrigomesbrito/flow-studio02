import { useRef, useState, useCallback } from 'react';
import { GripVertical, Upload, Lock } from 'lucide-react';
import { CanvasNode, Position } from '@/types/canvas';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface NodeCardProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  activeSourceHandleId: string | null;
  highlightedTargetHandleId: string | null;
  portColors: Map<string, string>;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (nodeId: string, startMouse: Position, altKey?: boolean) => void;
  onPortDragStart: (nodeId: string, portId: string) => void;
}

export function NodeCard({
  node,
  zoom,
  isSelected,
  activeSourceHandleId,
  highlightedTargetHandleId,
  portColors,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onPortDragStart,
}: NodeCardProps) {
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const isLocked = node.locked ?? false;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.port-handle') || (e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('input')) return;
    e.stopPropagation();
    onSelect(e);
    if (!isLocked) {
      onDragStart(node.id, { x: e.clientX, y: e.clientY }, e.altKey);
    }
  }, [node.id, onSelect, onDragStart, isLocked]);

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
  }, [node.size, onUpdate, zoom, isLocked]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onPortDragStart(node.id, portId);
  }, [node.id, onPortDragStart]);

  const processImageFile = useCallback((file: File) => {
    if (isLocked) return;
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdate({ imageUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, [onUpdate, isLocked]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  }, [processImageFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, [isLocked]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isLocked) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  }, [processImageFile, isLocked]);

  const getPortPosition = (side: string): React.CSSProperties => {
    switch (side) {
      case 'left': return { left: -10, top: '50%', transform: 'translateY(-50%)', '--port-hover-transform': 'translateY(-50%) scale(1.18)' } as React.CSSProperties;
      case 'right': return { right: -10, top: '50%', transform: 'translateY(-50%)', '--port-hover-transform': 'translateY(-50%) scale(1.18)' } as React.CSSProperties;
      case 'top': return { top: -10, left: '50%', transform: 'translateX(-50%)', '--port-hover-transform': 'translateX(-50%) scale(1.18)' } as React.CSSProperties;
      case 'bottom': return { bottom: -10, left: '50%', transform: 'translateX(-50%)', '--port-hover-transform': 'translateX(-50%) scale(1.18)' } as React.CSSProperties;
      default: return {};
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`node-card absolute select-none ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: node.size.width,
            height: node.size.height,
            zIndex: isSelected ? 100 : 10,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Lock indicator */}
          {isLocked && (
            <div className="absolute top-1 right-1 z-10">
              <Lock size={12} className="text-muted-foreground/60" />
            </div>
          )}

          {node.ports.map((port) => {
            const isSource = activeSourceHandleId === port.id;
            const isHighlighted = highlightedTargetHandleId === port.id;
            const connColor = portColors.get(port.id);
            const isConnected = !!connColor;

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
                  isConnected ? 'is-connected' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  ...getPortPosition(port.side),
                  ...(connColor ? { '--port-dynamic-color': connColor } as React.CSSProperties : {}),
                }}
                onMouseDown={(e) => handlePortMouseDown(e, port.id)}
              />
            );
          })}

          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <GripVertical size={14} className={`text-muted-foreground ${isLocked ? 'cursor-not-allowed' : 'cursor-grab'}`} />
              <input
                value={node.title}
                onChange={(e) => !isLocked && onUpdate({ title: e.target.value })}
                readOnly={isLocked}
                className="bg-transparent text-sm font-medium text-foreground outline-none w-full"
                placeholder="Título"
              />
            </div>
          </div>

          <div className="p-3 h-[calc(100%-42px)] overflow-hidden">
            {node.type === 'text' && (
              <textarea
                value={node.content}
                onChange={(e) => !isLocked && onUpdate({ content: e.target.value })}
                readOnly={isLocked}
                placeholder="Digite seu texto..."
                className="w-full h-full bg-secondary/50 rounded-lg p-3 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            )}
            {node.type === 'image' && (
              <div
                className="h-full flex flex-col"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {node.imageUrl ? (
                  <img src={node.imageUrl} alt="Uploaded" className="w-full flex-1 object-cover rounded-lg" />
                ) : (
                  <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
                    isLocked ? 'cursor-not-allowed border-border' :
                    isDragOver ? 'border-primary bg-primary/10 cursor-pointer' : 'border-border hover:border-primary/50 cursor-pointer'
                  }`}>
                    <Upload size={24} className="text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {isDragOver ? 'Solte a imagem aqui' : 'Clique ou arraste uma imagem'}
                    </span>
                    <span className="text-xs text-muted-foreground/50 mt-1">PNG, JPG, WEBP</span>
                    {!isLocked && <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleImageUpload} className="hidden" />}
                  </label>
                )}
              </div>
            )}
          </div>

          {!isLocked && (
            <div
              className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={handleResizeStart}
            >
              <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/30">
                <path d="M14 14L8 14L14 8Z" fill="currentColor" />
              </svg>
            </div>
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
