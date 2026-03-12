import { useRef, useState, useCallback } from 'react';
import { CanvasNode, Position } from '@/types/canvas';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistNodeProps {
  node: CanvasNode;
  zoom: number;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CanvasNode>) => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, startMouse: Position, altKey?: boolean) => void;
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
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
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
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {completedCount}/{items.length}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
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
            <button
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover/item:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 size={10} />
            </button>
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
  );
}
