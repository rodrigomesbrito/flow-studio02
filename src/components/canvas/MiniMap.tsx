import { useMemo } from 'react';
import { CanvasNode, Connection } from '@/types/canvas';

interface MiniMapProps {
  nodes: CanvasNode[];
  connections: Connection[];
  offset: { x: number; y: number };
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (offset: { x: number; y: number }) => void;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 100;
const PADDING = 40;

export function MiniMap({ nodes, connections, offset, zoom, canvasWidth, canvasHeight, onNavigate }: MiniMapProps) {
  const { scale, translateX, translateY, viewRect } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        scale: 1,
        translateX: 0,
        translateY: 0,
        viewRect: { x: 0, y: 0, w: MINIMAP_WIDTH, h: MINIMAP_HEIGHT },
      };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    });

    // Include viewport bounds
    const vpLeft = -offset.x / zoom;
    const vpTop = -offset.y / zoom;
    const vpRight = vpLeft + canvasWidth / zoom;
    const vpBottom = vpTop + canvasHeight / zoom;

    minX = Math.min(minX, vpLeft) - PADDING;
    minY = Math.min(minY, vpTop) - PADDING;
    maxX = Math.max(maxX, vpRight) + PADDING;
    maxY = Math.max(maxY, vpBottom) + PADDING;

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const s = Math.min(MINIMAP_WIDTH / worldW, MINIMAP_HEIGHT / worldH);

    // Viewport rect in minimap coords
    const vx = (vpLeft - minX) * s;
    const vy = (vpTop - minY) * s;
    const vw = (canvasWidth / zoom) * s;
    const vh = (canvasHeight / zoom) * s;

    return {
      scale: s,
      translateX: -minX,
      translateY: -minY,
      viewRect: { x: vx, y: vy, w: vw, h: vh },
    };
  }, [nodes, offset, zoom, canvasWidth, canvasHeight]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap coords to world coords
    const worldX = clickX / scale - translateX;
    const worldY = clickY / scale - translateY;

    // Center viewport on clicked point
    onNavigate({
      x: -(worldX * zoom - canvasWidth / 2),
      y: -(worldY * zoom - canvasHeight / 2),
    });
  };

  if (nodes.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-xl overflow-hidden">
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-pointer"
        onClick={handleClick}
      >
        {/* Background */}
        <rect width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} fill="hsl(var(--canvas-bg))" />

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const x = (node.position.x + translateX) * scale;
            const y = (node.position.y + translateY) * scale;
            const w = node.size.width * scale;
            const h = node.size.height * scale;
            return (
              <rect
                key={node.id}
                x={x}
                y={y}
                width={Math.max(w, 2)}
                height={Math.max(h, 2)}
                rx={1}
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.5}
              />
            );
          })}
        </g>

        {/* Connections */}
        <g>
          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
            const toNode = nodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;
            const x1 = (fromNode.position.x + fromNode.size.width / 2 + translateX) * scale;
            const y1 = (fromNode.position.y + fromNode.size.height / 2 + translateY) * scale;
            const x2 = (toNode.position.x + toNode.size.width / 2 + translateX) * scale;
            const y2 = (toNode.position.y + toNode.size.height / 2 + translateY) * scale;
            return (
              <line
                key={conn.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={conn.color || '#a855f7'}
                strokeWidth={0.8}
                strokeOpacity={0.6}
              />
            );
          })}
        </g>

        {/* Viewport rectangle */}
        <rect
          x={viewRect.x}
          y={viewRect.y}
          width={viewRect.w}
          height={viewRect.h}
          fill="hsl(var(--primary) / 0.08)"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeOpacity={0.6}
          rx={1}
        />
      </svg>
    </div>
  );
}
