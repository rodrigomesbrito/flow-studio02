import { Connection, CanvasNode } from '@/types/canvas';

interface ConnectionLinesProps {
  connections: Connection[];
  nodes: CanvasNode[];
  tempConnection: { fromX: number; fromY: number; toX: number; toY: number } | null;
}

function getPortWorldPosition(node: CanvasNode, portId: string): { x: number; y: number } | null {
  const port = node.ports.find(p => p.id === portId);
  if (!port) return null;

  const { x, y } = node.position;
  const { width, height } = node.size;

  switch (port.side) {
    case 'left': return { x, y: y + height / 2 };
    case 'right': return { x: x + width, y: y + height / 2 };
    case 'top': return { x: x + width / 2, y };
    case 'bottom': return { x: x + width / 2, y: y + height };
    default: return null;
  }
}

function CurvedPath({ x1, y1, x2, y2, isTemp = false }: { x1: number; y1: number; x2: number; y2: number; isTemp?: boolean }) {
  const dx = Math.abs(x2 - x1) * 0.5;
  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="hsl(270, 60%, 65%)"
        strokeWidth={2}
        strokeOpacity={isTemp ? 0.5 : 0.8}
        strokeDasharray={isTemp ? "6 4" : "none"}
        className={isTemp ? "connection-line-animated" : ""}
      />
      {!isTemp && (
        <path
          d={d}
          fill="none"
          stroke="hsl(270, 60%, 65%)"
          strokeWidth={6}
          strokeOpacity={0.1}
        />
      )}
    </g>
  );
}

export function ConnectionLines({ connections, nodes, tempConnection }: ConnectionLinesProps) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      {connections.map(conn => {
        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
        const toNode = nodes.find(n => n.id === conn.toNodeId);
        if (!fromNode || !toNode) return null;

        const from = getPortWorldPosition(fromNode, conn.fromPortId);
        const to = getPortWorldPosition(toNode, conn.toPortId);
        if (!from || !to) return null;

        return <CurvedPath key={conn.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
      })}
      {tempConnection && (
        <CurvedPath
          x1={tempConnection.fromX}
          y1={tempConnection.fromY}
          x2={tempConnection.toX}
          y2={tempConnection.toY}
          isTemp
        />
      )}
    </svg>
  );
}
