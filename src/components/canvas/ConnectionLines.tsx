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
  const dx = Math.abs(x2 - x1);
  const cp = Math.max(dx * 0.5, 50);
  const d = `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;

  const gradientId = `grad-${Math.round(x1)}-${Math.round(y1)}-${Math.round(x2)}-${Math.round(y2)}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(270, 60%, 65%)" />
          <stop offset="100%" stopColor="hsl(160, 60%, 50%)" />
        </linearGradient>
      </defs>
      {/* Glow layer */}
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={isTemp ? 8 : 10}
        strokeOpacity={isTemp ? 0.08 : 0.12}
        strokeLinecap="round"
      />
      {/* Main line */}
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={isTemp ? 2 : 2.5}
        strokeOpacity={isTemp ? 0.6 : 0.9}
        strokeLinecap="round"
        strokeDasharray={isTemp ? "8 6" : "none"}
        className={isTemp ? "connection-line-animated" : ""}
      />
      {/* Flow dots for established connections */}
      {!isTemp && (
        <circle r="3" fill="hsl(270, 60%, 75%)" opacity="0.8">
          <animateMotion dur="2s" repeatCount="indefinite" path={d} />
        </circle>
      )}
      {/* End dot for temp connections */}
      {isTemp && (
        <circle cx={x2} cy={y2} r="5" fill="hsl(160, 60%, 50%)" opacity="0.6">
          <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite" />
        </circle>
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
