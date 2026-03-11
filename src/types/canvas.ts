export type NodeType = 'text' | 'image';

export type CanvasTool = 'cursor' | 'hand' | 'connect';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Port {
  id: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  type: 'input' | 'output';
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  position: Position;
  size: Size;
  title: string;
  content: string;
  imageUrl?: string;
  ports: Port[];
}

export const CONNECTION_COLORS = [
  { label: 'Roxo', value: '#a78bfa' },
  { label: 'Azul', value: '#60a5fa' },
  { label: 'Verde', value: '#34d399' },
  { label: 'Vermelho', value: '#f87171' },
  { label: 'Amarelo', value: '#fbbf24' },
  { label: 'Ciano', value: '#22d3ee' },
] as const;

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  color?: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  connections: Connection[];
  offset: Position;
  zoom: number;
  selectedNodeId: string | null;
  history: { nodes: CanvasNode[]; connections: Connection[] }[];
  historyIndex: number;
}
