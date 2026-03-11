export type NodeType = 'text' | 'image';

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

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
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
