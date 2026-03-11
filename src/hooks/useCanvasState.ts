import { useState, useCallback, useRef } from 'react';
import { CanvasNode, Connection, Position, NodeType } from '@/types/canvas';

const DEFAULT_CONNECTION_COLOR = '#a855f7';

const createDefaultPorts = () => [
  { id: crypto.randomUUID(), side: 'left' as const, type: 'input' as const },
  { id: crypto.randomUUID(), side: 'right' as const, type: 'output' as const },
];

const getNodeDefaults = (type: NodeType) => {
  switch (type) {
    case 'freetext':
      return { width: 240, height: 60, title: 'Texto livre' };
    case 'image':
      return { width: 280, height: 300, title: 'Image' };
    default:
      return { width: 320, height: 180, title: 'Text' };
  }
};

const createNode = (type: NodeType, position: Position): CanvasNode => {
  const defaults = getNodeDefaults(type);
  return {
    id: crypto.randomUUID(),
    type,
    position,
    size: { width: defaults.width, height: defaults.height },
    title: defaults.title,
    content: '',
    ports: type === 'freetext' ? [] : createDefaultPorts(),
  };
};

const cloneState = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function useCanvasState() {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  const historyRef = useRef<{ nodes: CanvasNode[]; connections: Connection[] }[]>([{ nodes: [], connections: [] }]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback((nextNodes: CanvasNode[], nextConnections: Connection[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({ nodes: cloneState(nextNodes), connections: cloneState(nextConnections) });
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const addNode = useCallback((type: NodeType) => {
    const centerX = (-offset.x + window.innerWidth / 2) / zoom - 160;
    const centerY = (-offset.y + window.innerHeight / 2) / zoom - 100;
    const node = createNode(type, { x: centerX, y: centerY });

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, node];
      pushHistory(nextNodes, connections);
      return nextNodes;
    });

    setSelectedNodeId(node.id);
  }, [connections, offset.x, offset.y, pushHistory, zoom]);

  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>) => {
    setNodes((prevNodes) => prevNodes.map((node) => (node.id === id ? { ...node, ...updates } : node)));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prevNodes) => {
      const nextNodes = prevNodes.filter((node) => node.id !== id);
      setConnections((prevConnections) => {
        const nextConnections = prevConnections.filter((connection) => connection.fromNodeId !== id && connection.toNodeId !== id);
        pushHistory(nextNodes, nextConnections);
        return nextConnections;
      });
      return nextNodes;
    });

    setSelectedNodeId((current) => (current === id ? null : current));
  }, [pushHistory]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    const duplicatedNode: CanvasNode = {
      ...cloneState(node),
      id: crypto.randomUUID(),
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      ports: createDefaultPorts(),
    };

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, duplicatedNode];
      pushHistory(nextNodes, connections);
      return nextNodes;
    });

    setSelectedNodeId(duplicatedNode.id);
  }, [connections, nodes, pushHistory]);

  const addConnection = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => {
    if (fromNodeId === toNodeId) return;

    const sourceNode = nodes.find((node) => node.id === fromNodeId);
    const targetNode = nodes.find((node) => node.id === toNodeId);
    const sourcePort = sourceNode?.ports.find((port) => port.id === fromPortId);
    const targetPort = targetNode?.ports.find((port) => port.id === toPortId);

    if (!sourceNode || !targetNode || !sourcePort || !targetPort) return;
    if (sourcePort.type !== 'output' || targetPort.type !== 'input') return;

    setConnections((prevConnections) => {
      const exists = prevConnections.some((connection) =>
        connection.fromNodeId === fromNodeId &&
        connection.fromPortId === fromPortId &&
        connection.toNodeId === toNodeId &&
        connection.toPortId === toPortId
      );

      if (exists) return prevConnections;

      const nextConnections = [
        ...prevConnections,
        {
          id: crypto.randomUUID(),
          fromNodeId,
          fromPortId,
          toNodeId,
          toPortId,
          color: DEFAULT_CONNECTION_COLOR,
        },
      ];

      pushHistory(nodes, nextConnections);
      return nextConnections;
    });
  }, [nodes, pushHistory]);

  const deleteConnection = useCallback((id: string) => {
    setConnections((prevConnections) => {
      const nextConnections = prevConnections.filter((connection) => connection.id !== id);
      pushHistory(nodes, nextConnections);
      return nextConnections;
    });
  }, [nodes, pushHistory]);

  const updateConnectionColor = useCallback((id: string, color: string) => {
    setConnections((prevConnections) => {
      const nextConnections = prevConnections.map((connection) =>
        connection.id === id ? { ...connection, color } : connection,
      );
      pushHistory(nodes, nextConnections);
      return nextConnections;
    });
  }, [nodes, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const state = historyRef.current[historyIndexRef.current];
    setNodes(cloneState(state.nodes));
    setConnections(cloneState(state.connections));
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];
    setNodes(cloneState(state.nodes));
    setConnections(cloneState(state.connections));
  }, []);

  const zoomIn = useCallback(() => setZoom((value) => Math.min(value * 1.2, 3)), []);
  const zoomOut = useCallback(() => setZoom((value) => Math.max(value / 1.2, 0.2)), []);
  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return {
    nodes,
    connections,
    offset,
    zoom,
    selectedNodeId,
    setOffset,
    setZoom,
    setSelectedNodeId,
    addNode,
    updateNode,
    deleteNode,
    duplicateNode,
    addConnection,
    deleteConnection,
    updateConnectionColor,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetView,
  };
}
