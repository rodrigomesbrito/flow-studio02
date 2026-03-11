import { Connection, CanvasNode, CONNECTION_COLORS, hexToHsl } from '@/types/canvas';
import { useMemo } from 'react';
import { getHandleWorldPosition, getBezierPath, getBezierMidpoint, DEFAULT_EDGE_COLOR } from './connection-utils';

interface ConnectionLinesProps {
  connections: Connection[];
  nodes: CanvasNode[];
  tempConnection: { fromX: number; fromY: number; toX: number; toY: number } | null;
  selectedConnectionId: string | null;
  onSelectConnection: (id: string | null) => void;
  onUpdateConnectionColor: (id: string, color: string) => void;
  onDeleteConnection: (id: string) => void;
}

function Edge({ x1, y1, x2, y2, color, isTemp = false, isSelected = false, onClick }: {
  x1: number; y1: number; x2: number; y2: number;
  color?: string; isTemp?: boolean; isSelected?: boolean; onClick?: () => void;
}) {
  const d = getBezierPath(x1, y1, x2, y2);
  const lineColor = color || DEFAULT_EDGE_COLOR;

  return (
    <g>
      {/* Invisible wide hit area for clicking */}
      {!isTemp && (
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={24}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        />
      )}
      {/* Glow / shadow layer */}
      <path
        d={d}
        fill="none"
        stroke={lineColor}
        strokeWidth={isTemp ? 8 : isSelected ? 14 : 10}
        strokeOpacity={isSelected ? 0.22 : isTemp ? 0.1 : 0.14}
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
      {/* Main visible line */}
      <path
        d={d}
        fill="none"
        stroke={lineColor}
        strokeWidth={isSelected ? 3 : isTemp ? 2 : 2.5}
        strokeOpacity={isTemp ? 0.7 : 0.95}
        strokeLinecap="round"
        strokeDasharray={isTemp ? '8 6' : undefined}
        className={isTemp ? 'connection-line-animated' : ''}
        style={{ pointerEvents: 'none' }}
      />
      {/* Animated dot flowing along edge */}
      {!isTemp && (
        <circle r="3" fill={lineColor} opacity="0.85" style={{ pointerEvents: 'none' }}>
          <animateMotion dur="2s" repeatCount="indefinite" path={d} />
        </circle>
      )}
      {/* Pulsing endpoint for temp connections */}
      {isTemp && (
        <circle cx={x2} cy={y2} r="5" fill={lineColor} opacity="0.7" style={{ pointerEvents: 'none' }}>
          <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

function ColorPicker({ connectionId, currentColor, onChangeColor, onDelete, position }: {
  connectionId: string;
  currentColor: string;
  onChangeColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  position: { x: number; y: number };
}) {
  const inputColor = useMemo(() => {
    const match = currentColor.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
    if (!match) return '#a78bfa';
    const [, hRaw, sRaw, lRaw] = match;
    const h = Number(hRaw) / 360;
    const s = Number(sRaw) / 100;
    const l = Number(lRaw) / 100;

    const hueToRgb = (p: number, q: number, t: number) => {
      let temp = t;
      if (temp < 0) temp += 1;
      if (temp > 1) temp -= 1;
      if (temp < 1 / 6) return p + (q - p) * 6 * temp;
      if (temp < 1 / 2) return q;
      if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
      return p;
    };

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p2 = 2 * l - q2;
      r = hueToRgb(p2, q2, h + 1 / 3);
      g = hueToRgb(p2, q2, h);
      b = hueToRgb(p2, q2, h - 1 / 3);
    }

    return `#${[r, g, b].map(ch => Math.round(ch * 255).toString(16).padStart(2, '0')).join('')}`;
  }, [currentColor]);

  return (
    <foreignObject x={position.x - 92} y={position.y - 66} width={184} height={60} style={{ overflow: 'visible', pointerEvents: 'auto' }}>
      <div className="bg-card/95 border border-node-border rounded-lg shadow-xl p-2 flex items-center gap-1.5 backdrop-blur-sm">
        {CONNECTION_COLORS.map((colorOption) => (
          <button
            key={colorOption.value}
            onClick={() => onChangeColor(connectionId, colorOption.value)}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
            style={{ background: colorOption.value, borderColor: currentColor === colorOption.value ? 'hsl(var(--foreground))' : 'transparent' }}
            title={colorOption.label}
          />
        ))}
        <input
          type="color"
          value={inputColor}
          onChange={(e) => onChangeColor(connectionId, hexToHsl(e.target.value))}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
          title="Cor personalizada"
        />
        <button
          onClick={() => onDelete(connectionId)}
          className="ml-1 text-destructive hover:text-destructive/80 text-xs font-medium flex-shrink-0"
          title="Deletar"
        >
          ✕
        </button>
      </div>
    </foreignObject>
  );
}

export function ConnectionLines({ connections, nodes, tempConnection, selectedConnectionId, onSelectConnection, onUpdateConnectionColor, onDeleteConnection }: ConnectionLinesProps) {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <g style={{ pointerEvents: 'auto' }}>
        {connections.map((conn) => {
          const fromNode = nodes.find(n => n.id === conn.fromNodeId);
          const toNode = nodes.find(n => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;
          const from = getHandleWorldPosition(fromNode, conn.fromPortId);
          const to = getHandleWorldPosition(toNode, conn.toPortId);
          if (!from || !to) return null;
          const isSelected = selectedConnectionId === conn.id;
          const midpoint = getBezierMidpoint(from.x, from.y, to.x, to.y);

          return (
            <g key={conn.id}>
              <Edge
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                color={conn.color}
                isSelected={isSelected}
                onClick={() => onSelectConnection(isSelected ? null : conn.id)}
              />
              {isSelected && (
                <ColorPicker
                  connectionId={conn.id}
                  currentColor={conn.color || DEFAULT_EDGE_COLOR}
                  onChangeColor={onUpdateConnectionColor}
                  onDelete={onDeleteConnection}
                  position={midpoint}
                />
              )}
            </g>
          );
        })}
      </g>
      {tempConnection && (
        <Edge
          x1={tempConnection.fromX} y1={tempConnection.fromY}
          x2={tempConnection.toX} y2={tempConnection.toY}
          isTemp
        />
      )}
    </svg>
  );
}
