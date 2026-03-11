import { Connection, CanvasNode, CONNECTION_COLORS } from '@/types/canvas';
import { useState } from 'react';

interface ConnectionLinesProps {
  connections: Connection[];
  nodes: CanvasNode[];
  tempConnection: { fromX: number; fromY: number; toX: number; toY: number } | null;
  selectedConnectionId: string | null;
  onSelectConnection: (id: string | null) => void;
  onUpdateConnectionColor: (id: string, color: string) => void;
  onDeleteConnection: (id: string) => void;
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

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1);
  const cp = Math.max(dx * 0.5, 50);
  return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
}

function CurvedPath({ x1, y1, x2, y2, isTemp = false, color, isSelected = false, onClick }: {
  x1: number; y1: number; x2: number; y2: number; isTemp?: boolean;
  color?: string; isSelected?: boolean; onClick?: () => void;
}) {
  const d = bezierPath(x1, y1, x2, y2);
  const lineColor = color || '#a78bfa';

  return (
    <g>
      {/* Invisible fat hit area for clicking */}
      {!isTemp && (
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        />
      )}
      {/* Glow */}
      <path d={d} fill="none" stroke={lineColor} strokeWidth={isTemp ? 8 : isSelected ? 14 : 10}
        strokeOpacity={isSelected ? 0.2 : isTemp ? 0.08 : 0.12} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
      {/* Main line */}
      <path d={d} fill="none" stroke={lineColor} strokeWidth={isSelected ? 3 : isTemp ? 2 : 2.5}
        strokeOpacity={isTemp ? 0.6 : 0.9} strokeLinecap="round"
        strokeDasharray={isTemp ? '8 6' : 'none'}
        className={isTemp ? 'connection-line-animated' : ''} style={{ pointerEvents: 'none' }} />
      {/* Flow dot */}
      {!isTemp && (
        <circle r="3" fill={lineColor} opacity="0.8" style={{ pointerEvents: 'none' }}>
          <animateMotion dur="2s" repeatCount="indefinite" path={d} />
        </circle>
      )}
      {/* Temp end dot */}
      {isTemp && (
        <circle cx={x2} cy={y2} r="5" fill={lineColor} opacity="0.6" style={{ pointerEvents: 'none' }}>
          <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

function ColorPicker({ connectionId, currentColor, onChangeColor, onDelete, position }: {
  connectionId: string; currentColor: string;
  onChangeColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  position: { x: number; y: number };
}) {
  const [customColor, setCustomColor] = useState(currentColor);

  return (
    <foreignObject x={position.x - 90} y={position.y - 60} width={180} height={52} style={{ overflow: 'visible' }}>
      <div className="bg-card border border-node-border rounded-lg shadow-xl p-2 flex items-center gap-1.5">
        {CONNECTION_COLORS.map(c => (
          <button key={c.value} onClick={() => onChangeColor(connectionId, c.value)}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
            style={{ background: c.value, borderColor: currentColor === c.value ? '#fff' : 'transparent' }}
            title={c.label} />
        ))}
        <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); onChangeColor(connectionId, e.target.value); }}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0" title="Cor personalizada" />
        <button onClick={() => onDelete(connectionId)}
          className="ml-1 text-destructive hover:text-destructive/80 text-xs font-medium flex-shrink-0" title="Deletar">✕</button>
      </div>
    </foreignObject>
  );
}

export function ConnectionLines({ connections, nodes, tempConnection, selectedConnectionId, onSelectConnection, onUpdateConnectionColor, onDeleteConnection }: ConnectionLinesProps) {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible', pointerEvents: 'none' }}>
      {connections.map(conn => {
        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
        const toNode = nodes.find(n => n.id === conn.toNodeId);
        if (!fromNode || !toNode) return null;
        const from = getPortWorldPosition(fromNode, conn.fromPortId);
        const to = getPortWorldPosition(toNode, conn.toPortId);
        if (!from || !to) return null;
        const isSelected = selectedConnectionId === conn.id;

        return (
          <g key={conn.id}>
            <CurvedPath x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              color={conn.color} isSelected={isSelected}
              onClick={() => onSelectConnection(isSelected ? null : conn.id)} />
            {isSelected && (
              <ColorPicker connectionId={conn.id} currentColor={conn.color || '#a78bfa'}
                onChangeColor={onUpdateConnectionColor} onDelete={onDeleteConnection}
                position={{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }} />
            )}
          </g>
        );
      })}
      {tempConnection && (
        <CurvedPath x1={tempConnection.fromX} y1={tempConnection.fromY}
          x2={tempConnection.toX} y2={tempConnection.toY} isTemp />
      )}
    </svg>
  );
}
