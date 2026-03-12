import { useRef, useState, useCallback } from 'react';
import { CanvasNode, Position } from '@/types/canvas';
import { Plus, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistNodeProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  activeSourceHandleId: string | null;
  highlightedTargetHandleId: string | null;
  portColors: Map<string, string>;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, startMouse: Position, altKey?: boolean) => void;
  onPortDragStart: (nodeId: string, portId: string) => void;
}

function parseChecklist(content: string): ChecklistItem[] {
  if (!content) return [{ id: crypto.randomUUID(), text: '', checked: false }];
  try {
    return JSON.parse(content);
  } catch {
    return [{ id: crypto.randomUUID(), text: '', checked: false }];
  }
}

export function ChecklistNode({
  node,
  zoom,
  isSelected,
  activeSourceHandleId,
  highlightedTargetHandleId,
  portColors,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onPortDragStart,
}: ChecklistNodeProps) {
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);

  const items = parseChecklist(node.content);

  const updateItems = useCallback((newItems: ChecklistItem[]) => {
    onUpdate({ content: JSON.stringify(newItems) });
  }, [onUpdate]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.resize-handle') ||
      (e.target as HTMLElement).closest('.port-handle') ||
      (e.target as HTMLElement).closest('input[type="checkbox"]') ||
      (e.target as HTMLElement).closest('.checklist-input') ||
      (e.target as HTMLElement).closest('button')
    ) return;
    e.stopPropagation();
    onSelect(e);
    onDragStart(node.id, { x: e.clientX, y: e.clientY }, e.altKey);
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
          height: Math.max(100, resizeRef.current.startH + dy),
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

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onPortDragStart(node.id, portId);
  }, [node.id, onPortDragStart]);

  const toggleItem = useCallback((id: string) => {
    updateItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }, [items, updateItems]);

  const updateItemText = useCallback((id: string, text: string) => {
    updateItems(items.map(item => item.id === id ? { ...item, text } : item));
  }, [items, updateItems]);

  const addItem = useCallback(() => {
    updateItems([...items, { id: crypto.randomUUID(), text: '', checked: false }]);
  }, [items, updateItems]);

  const removeItem = useCallback((id: string) => {
    if (items.length <= 1) return;
    updateItems(items.filter(item => item.id !== id));
  }, [items, updateItems]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
    if (e.key === 'Backspace' && items.find(i => i.id === itemId)?.text === '') {
      e.preventDefault();
      removeItem(itemId);
    }
  }, [addItem, removeItem, items]);

  const completedCount = items.filter(i => i.checked).length;

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
          {/* Connection ports */}
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

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 flex-1">
              <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />
              {editingTitle ? (
                <input
                  autoFocus
                  value={node.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                  className="bg-transparent text-sm font-medium text-foreground outline-none w-full"
                />
              ) : (
                <span
                  className="text-sm font-medium text-foreground cursor-text truncate"
                  onDoubleClick={() => setEditingTitle(true)}
                >
                  {node.title || 'Checklist'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {completedCount}/{items.length}
            </span>
          </div>

          {/* Items */}
          <div className="p-2 h-[calc(100%-42px)] overflow-y-auto space-y-0.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group/item px-1 py-1 rounded hover:bg-secondary/40 transition-colors">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="shrink-0 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <input
                  value={item.text}
                  onChange={(e) => updateItemText(item.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  placeholder="Nova tarefa..."
                  className={`checklist-input flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 ${
                    item.checked ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}
                />
              </div>
            ))}

            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-1 py-1 text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors w-full"
            >
              <Plus size={12} />
              Adicionar item
            </button>
          </div>

          {/* Resize handle */}
          <div
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeStart}
          >
            <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/30">
              <path d="M14 14L8 14L14 8Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40 bg-card/95 backdrop-blur-xl border-border">
        <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive">
          Apagar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
