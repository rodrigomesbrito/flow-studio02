import { CanvasNode, Port, Position } from '@/types/canvas';

export const DEFAULT_EDGE_COLOR = '#a855f7';
export const HANDLE_HIT_RADIUS = 18;

export interface HandlePosition {
  nodeId: string;
  handle: Port;
  position: Position;
}

export function getHandleWorldPosition(node: CanvasNode, handleId: string): Position | null {
  const handle = node.ports.find((port) => port.id === handleId);
  if (!handle) return null;

  const { x, y } = node.position;
  const { width, height } = node.size;

  switch (handle.side) {
    case 'left':
      return { x, y: y + height / 2 };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'top':
      return { x: x + width / 2, y };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    default:
      return null;
  }
}

export function getNodeHandlePositions(node: CanvasNode): HandlePosition[] {
  return node.ports
    .map((handle) => {
      const position = getHandleWorldPosition(node, handle.id);
      if (!position) return null;
      return { nodeId: node.id, handle, position };
    })
    .filter((value): value is HandlePosition => value !== null);
}

export function isValidHandleConnection(sourceNodeId: string, sourceHandle: Port, targetNodeId: string, targetHandle: Port) {
  return sourceNodeId !== targetNodeId && sourceHandle.type === 'output' && targetHandle.type === 'input';
}

export function findClosestCompatibleHandle({
  nodes, sourceNodeId, sourceHandleId, point, maxDistance = HANDLE_HIT_RADIUS,
}: {
  nodes: CanvasNode[];
  sourceNodeId: string;
  sourceHandleId: string;
  point: Position;
  maxDistance?: number;
}): HandlePosition | null {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId);
  const sourceHandle = sourceNode?.ports.find((port) => port.id === sourceHandleId);

  if (!sourceNode || !sourceHandle || sourceHandle.type !== 'output') return null;

  let closest: HandlePosition | null = null;
  let closestDistance = maxDistance;

  for (const node of nodes) {
    for (const candidate of getNodeHandlePositions(node)) {
      if (!isValidHandleConnection(sourceNodeId, sourceHandle, candidate.nodeId, candidate.handle)) continue;
      const distance = Math.hypot(candidate.position.x - point.x, candidate.position.y - point.y);
      if (distance <= closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
  }

  return closest;
}

export function getBezierPath(startX: number, startY: number, endX: number, endY: number) {
  const offsetX = Math.abs(endX - startX) * 0.5;
  return `M ${startX} ${startY} C ${startX + offsetX} ${startY}, ${endX - offsetX} ${endY}, ${endX} ${endY}`;
}

export function getBezierMidpoint(x1: number, y1: number, x2: number, y2: number) {
  const offsetX = Math.abs(x2 - x1) * 0.5;
  const p0 = { x: x1, y: y1 };
  const p1 = { x: x1 + offsetX, y: y1 };
  const p2 = { x: x2 - offsetX, y: y2 };
  const p3 = { x: x2, y: y2 };
  const t = 0.5;
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}
