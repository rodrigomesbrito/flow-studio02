import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CanvasNode, Position } from '@/types/canvas';
import { Plus, GripVertical, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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

function createEmptyChecklistItem(id: string): ChecklistItem {
  return { id, text: '', checked: false };
}

function parseChecklist(content: string, fallbackId: string): ChecklistItem[] {
  if (!content) return [createEmptyChecklistItem(fallbackId)];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [createEmptyChecklistItem(fallbackId)];
  } catch {
    return [createEmptyChecklistItem(fallbackId)];
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
  const firstInputRef = useRef<HTMLInputElement>(null);
  const initialItemIdRef = useRef(crypto.randomUUID());
  const isLocked = node.locked ?? false;

  const items = useMemo(
    () => parseChecklist(node.content, initialItemIdRef.current),
    [node.content],
  );

  useEffect(() => {
    if (!node.content && !isLocked) {
      onUpdate({ content: JSON.stringify(items) });
    }
  }, [node.content, isLocked, onUpdate, items]);

  // Auto-focus first input when node is first created (empty first item)
  useEffect(() => {
    if (items.length === 1 && items[0].text === '' && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []); // only on mount

  const updateItems = useCallback((newItems: ChecklistItem[]) => {
    if (isLocked) return;
    onUpdate({ content: JSON.stringify(newItems) });
  }, [onUpdate, isLocked]);

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
  }, [node.size, onUpdate, zoom, isLocked]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onPortDragStart(node.id, portId);
  }, [node.id, onPortDragStart]);

  const toggleItem = useCallback((id: string) => {
    if (isLocked) return;
    updateItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }, [items, updateItems, isLocked]);

  const updateItemText = useCallback((id: string, text: string) => {
    if (isLocked) return;
    updateItems(items.map(item => item.id === id ? { ...item, text } : item));
  }, [items, updateItems, isLocked]);

  const addItem = useCallback(() => {
    if (isLocked) return;
    updateItems([...items, { id: crypto.randomUUID(), text: '', checked: false }]);
  }, [items, updateItems, isLocked]);

  const removeItem = useCallback((id: string) => {
    if (isLocked) return;
    if (items.length <= 1) return;
    updateItems(items.filter(item => item.id !== id));
  }, [items, updateItems, isLocked]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string) => {
    if (isLocked) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
    if (e.key === 'Backspace' && items.find(i => i.id === itemId)?.text === '') {
      e.preventDefault();
      removeItem(itemId);
    }
  }, [addItem, removeItem, items, isLocked]);

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
              <GripVertical size={14} className={`text-muted-foreground shrink-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-grab'}`} />
              {editingTitle && !isLocked ? (
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
                  onDoubleClick={() => !isLocked && setEditingTitle(true)}
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
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 group/item px-1 py-1 rounded hover:bg-secondary/40 transition-colors">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  disabled={isLocked}
                  className="shrink-0 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <input
                  ref={index === 0 ? firstInputRef : undefined}
                  value={item.text}
                  onChange={(e) => updateItemText(item.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  placeholder="Nova tarefa..."
                  readOnly={isLocked}
                  className={`checklist-input flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 ${
                    item.checked ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}
                />
              </div>
            ))}

            {!isLocked && (
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 px-1 py-1 text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors w-full"
              >
                <Plus size={12} />
                Adicionar item
              </button>
            )}
          </div>

          {/* Resize handle */}
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
