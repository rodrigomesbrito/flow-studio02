import { useCallback, useMemo } from 'react';
import { CanvasNode, Position } from '@/types/canvas';
import {
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  ArrowRightLeft, ArrowUpDown,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AlignmentToolbarProps {
  selectedNodeIds: Set<string>;
  nodes: CanvasNode[];
  offset: Position;
  zoom: number;
  onApplyUpdates: (updates: Array<{ id: string; updates: Partial<CanvasNode> }>) => void;
}

export function AlignmentToolbar({
  selectedNodeIds,
  nodes,
  offset,
  zoom,
  onApplyUpdates,
}: AlignmentToolbarProps) {
  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedNodeIds.has(n.id)),
    [nodes, selectedNodeIds]
  );

  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of selectedNodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.size.width);
      maxY = Math.max(maxY, n.position.y + n.size.height);
    }
    return { minX, minY, maxX, maxY };
  }, [selectedNodes]);

  const alignLeft = useCallback(() => {
    onApplyUpdates(selectedNodes.map((n) => ({ id: n.id, updates: { position: { ...n.position, x: bounds.minX } } })));
  }, [selectedNodes, bounds.minX, onApplyUpdates]);

  const alignCenterH = useCallback(() => {
    const center = (bounds.minX + bounds.maxX) / 2;
    onApplyUpdates(selectedNodes.map((n) => ({ id: n.id, updates: { position: { ...n.position, x: center - n.size.width / 2 } } })));
  }, [selectedNodes, bounds, onApplyUpdates]);

  const alignRight = useCallback(() => {
    onApplyUpdates(selectedNodes.map((n) => ({ id: n.id, updates: { position: { ...n.position, x: bounds.maxX - n.size.width } } })));
  }, [selectedNodes, bounds.maxX, onApplyUpdates]);

  const alignTop = useCallback(() => {
    onApplyUpdates(selectedNodes.map((n) => ({ id: n.id, updates: { position: { ...n.position, y: bounds.minY } } })));
  }, [selectedNodes, bounds.minY, onApplyUpdates]);

  const alignCenterV = useCallback(() => {
    const center = (bounds.minY + bounds.maxY) / 2;
    onApplyUpdates(selectedNodes.map((n) => ({ id: n.id, updates: { position: { ...n.position, y: center - n.size.height / 2 } } })));
  }, [selectedNodes, bounds, onApplyUpdates]);

  const alignBottom = useCallback(() => {
    onApplyUpdates(selectedNodes.map((n) => ({ id: n.id, updates: { position: { ...n.position, y: bounds.maxY - n.size.height } } })));
  }, [selectedNodes, bounds.maxY, onApplyUpdates]);

  const distributeH = useCallback(() => {
    if (selectedNodes.length < 3) return;
    const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const totalWidth = sorted.reduce((sum, n) => sum + n.size.width, 0);
    const gap = (bounds.maxX - bounds.minX - totalWidth) / (sorted.length - 1);
    let x = bounds.minX;
    onApplyUpdates(sorted.map((n) => {
      const next = { id: n.id, updates: { position: { ...n.position, x } } };
      x += n.size.width + gap;
      return next;
    }));
  }, [selectedNodes, bounds, onApplyUpdates]);

  const distributeV = useCallback(() => {
    if (selectedNodes.length < 3) return;
    const sorted = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const totalHeight = sorted.reduce((sum, n) => sum + n.size.height, 0);
    const gap = (bounds.maxY - bounds.minY - totalHeight) / (sorted.length - 1);
    let y = bounds.minY;
    onApplyUpdates(sorted.map((n) => {
      const next = { id: n.id, updates: { position: { ...n.position, y } } };
      y += n.size.height + gap;
      return next;
    }));
  }, [selectedNodes, bounds, onApplyUpdates]);

  // Early return AFTER all hooks
  if (selectedNodes.length < 2) return null;

  const toolbarX = offset.x + ((bounds.minX + bounds.maxX) / 2) * zoom;
  const toolbarY = offset.y + bounds.minY * zoom - 52;

  const actions = [
    { icon: AlignLeft, label: 'Alinhar à esquerda', action: alignLeft },
    { icon: AlignCenter, label: 'Centralizar horizontal', action: alignCenterH },
    { icon: AlignRight, label: 'Alinhar à direita', action: alignRight },
    null,
    { icon: AlignStartVertical, label: 'Alinhar ao topo', action: alignTop },
    { icon: AlignCenterVertical, label: 'Centralizar vertical', action: alignCenterV },
    { icon: AlignEndVertical, label: 'Alinhar embaixo', action: alignBottom },
    null,
    { icon: ArrowRightLeft, label: 'Distribuir horizontalmente', action: distributeH },
    { icon: ArrowUpDown, label: 'Distribuir verticalmente', action: distributeV },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="absolute z-[10001] pointer-events-auto"
        style={{ left: toolbarX, top: toolbarY, transform: 'translateX(-50%)' }}
      >
        <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur-xl border border-border rounded-lg px-1 py-1 shadow-lg">
          {actions.map((item, i) =>
            item === null ? (
              <div key={i} className="w-px h-5 bg-border mx-0.5" />
            ) : (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); item.action(); }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <item.icon size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{item.label}</TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
