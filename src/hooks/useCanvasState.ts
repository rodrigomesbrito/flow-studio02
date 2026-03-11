import { useState, useCallback, useRef } from 'react';
import { CanvasNode, Connection, Position, NodeType } from '@/types/canvas';

const createDefaultPorts = () => [
  { id: crypto.randomUUID(), side: 'left' as const, type: 'input' as const },
  { id: crypto.randomUUID(), side: 'right' as const, type: 'output' as const },
];

const createNode = (type: NodeType, position: Position): CanvasNode => ({
  id: crypto.randomUUID(),
  type,
  position,
  size: { width: type === 'image' ? 280 : 320, height: type === 'image' ? 300 : 180 },
  title: type === 'text' ? 'Text' : 'Image',
  content: '',
  ports: createDefaultPorts(),
});

export function useCanvasState() {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // History for undo/redo
  const historyRef = useRef<{ nodes: CanvasNode[]; connections: Connection[] }[]>([{ nodes: [], connections: [] }]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback((n: CanvasNode[], c: Connection[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({ nodes: JSON.parse(JSON.stringify(n)), connections: JSON.parse(JSON.stringify(c)) });
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const addNode = useCallback((type: NodeType) => {
    const centerX = (-offset.x + window.innerWidth / 2) / zoom - 160;
    const centerY = (-offset.y + window.innerHeight / 2) / zoom - 100;
    const node = createNode(type, { x: centerX, y: centerY });
    setNodes(prev => {
      const next = [...prev, node];
      pushHistory(next, connections);
      return next;
    });
    setSelectedNodeId(node.id);
  }, [offset, zoom, connections, pushHistory]);

  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>) => {
    setNodes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, ...updates } : n);
      pushHistory(next, connections);
      return next;
    });
  }, [connections, pushHistory]);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => {
      const next = prev.filter(n => n.id !== id);
      setConnections(prevC => {
        const nextC = prevC.filter(c => c.fromNodeId !== id && c.toNodeId !== id);
        pushHistory(next, nextC);
        return nextC;
      });
      return next;
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId, pushHistory]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newNode: CanvasNode = {
      ...JSON.parse(JSON.stringify(node)),
      id: crypto.randomUUID(),
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      ports: createDefaultPorts(),
    };
    setNodes(prev => {
      const next = [...prev, newNode];
      pushHistory(next, connections);
      return next;
    });
    setSelectedNodeId(newNode.id);
  }, [nodes, connections, pushHistory]);

  const addConnection = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => {
    if (fromNodeId === toNodeId) return;
    const exists = connections.some(c => c.fromNodeId === fromNodeId && c.fromPortId === fromPortId && c.toNodeId === toNodeId && c.toPortId === toPortId);
    if (exists) return;
    const conn: Connection = { id: crypto.randomUUID(), fromNodeId, fromPortId, toNodeId, toPortId };
    setConnections(prev => {
      const next = [...prev, conn];
      pushHistory(nodes, next);
      return next;
    });
  }, [connections, nodes, pushHistory]);

  const deleteConnection = useCallback((id: string) => {
    setConnections(prev => {
      const next = prev.filter(c => c.id !== id);
      pushHistory(nodes, next);
      return next;
    });
  }, [nodes, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    setNodes(JSON.parse(JSON.stringify(state.nodes)));
    setConnections(JSON.parse(JSON.stringify(state.connections)));
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    setNodes(JSON.parse(JSON.stringify(state.nodes)));
    setConnections(JSON.parse(JSON.stringify(state.connections)));
  }, []);

  const zoomIn = useCallback(() => setZoom(z => Math.min(z * 1.2, 3)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(z / 1.2, 0.2)), []);
  const resetView = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  return {
    nodes, connections, offset, zoom, selectedNodeId,
    setOffset, setZoom, setSelectedNodeId,
    addNode, updateNode, deleteNode, duplicateNode,
    addConnection, deleteConnection,
    undo, redo, zoomIn, zoomOut, resetView,
  };
}
