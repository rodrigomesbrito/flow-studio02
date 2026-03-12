export type NodeType = 'text' | 'image' | 'freetext' | 'checklist' | 'frame';

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

export interface TextStyle {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
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
  textStyle?: TextStyle;
}

export const CONNECTION_COLORS = [
  { label: 'Roxo', value: 'hsl(270 60% 65%)' },
  { label: 'Azul', value: 'hsl(217 91% 60%)' },
  { label: 'Verde', value: 'hsl(160 60% 50%)' },
  { label: 'Vermelho', value: 'hsl(0 84% 67%)' },
  { label: 'Amarelo', value: 'hsl(43 96% 56%)' },
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

export function hexToHsl(hex: string) {
  const normalized = hex.replace('#', '');
  const fullHex = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

