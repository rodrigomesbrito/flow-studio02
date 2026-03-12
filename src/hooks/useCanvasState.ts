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
    case 'checklist':
      return { width: 280, height: 220, title: 'Checklist' };
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
    ports: (type === 'freetext' || type === 'checklist') ? [] : createDefaultPorts(),
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

  // Clipboard for copy/paste
  const clipboardRef = useRef<{ nodes: CanvasNode[]; connections: Connection[] } | null>(null);

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

    setSelectedNodeIds(new Set([node.id]));
    return node.id;
  }, [connections, offset.x, offset.y, pushHistory, zoom]);

  // Add node at specific canvas position (for double-click)
  const addNodeAt = useCallback((type: NodeType, position: Position) => {
    const defaults = getNodeDefaults(type);
    const node = createNode(type, {
      x: position.x - defaults.width / 2,
      y: position.y - defaults.height / 2,
    });

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, node];
      pushHistory(nextNodes, connections);
      return nextNodes;
    });

    setSelectedNodeIds(new Set([node.id]));
    return node.id;
  }, [connections, pushHistory]);

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

    setSelectedNodeIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, [pushHistory]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    const duplicatedNode: CanvasNode = {
      ...cloneState(node),
      id: crypto.randomUUID(),
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      ports: (node.type === 'freetext' || node.type === 'checklist') ? [] : createDefaultPorts(),
    };

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, duplicatedNode];
      pushHistory(nextNodes, connections);
      return nextNodes;
    });

    setSelectedNodeIds(new Set([duplicatedNode.id]));
  }, [connections, nodes, pushHistory]);

  // Duplicate multiple nodes preserving relative positions
  const duplicateNodes = useCallback((ids: Set<string>, offsetDelta: Position = { x: 40, y: 40 }) => {
    const sourceNodes = nodes.filter((n) => ids.has(n.id));
    if (sourceNodes.length === 0) return new Map<string, string>();

    const idMap = new Map<string, string>();
    const newNodes: CanvasNode[] = sourceNodes.map((node) => {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
      return {
        ...cloneState(node),
        id: newId,
        position: { x: node.position.x + offsetDelta.x, y: node.position.y + offsetDelta.y },
        ports: node.type === 'freetext' ? [] : createDefaultPorts(),
      };
    });

    // Also duplicate connections between duplicated nodes
    const newConnections: Connection[] = [];
    connections.forEach((conn) => {
      if (idMap.has(conn.fromNodeId) && idMap.has(conn.toNodeId)) {
        const newFromNode = newNodes.find((n) => n.id === idMap.get(conn.fromNodeId));
        const newToNode = newNodes.find((n) => n.id === idMap.get(conn.toNodeId));
        if (newFromNode && newToNode) {
          newConnections.push({
            ...conn,
            id: crypto.randomUUID(),
            fromNodeId: newFromNode.id,
            fromPortId: newFromNode.ports.find((p) => p.type === 'output')?.id || conn.fromPortId,
            toNodeId: newToNode.id,
            toPortId: newToNode.ports.find((p) => p.type === 'input')?.id || conn.toPortId,
          });
        }
      }
    });

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, ...newNodes];
      setConnections((prevConns) => {
        const nextConns = [...prevConns, ...newConnections];
        pushHistory(nextNodes, nextConns);
        return nextConns;
      });
      return nextNodes;
    });

    setSelectedNodeIds(new Set(newNodes.map((n) => n.id)));
    return idMap;
  }, [connections, nodes, pushHistory]);

  // Copy selected nodes to clipboard
  const copyNodes = useCallback((ids: Set<string>) => {
    const sourceNodes = nodes.filter((n) => ids.has(n.id));
    const sourceConns = connections.filter(
      (c) => ids.has(c.fromNodeId) && ids.has(c.toNodeId)
    );
    clipboardRef.current = { nodes: cloneState(sourceNodes), connections: cloneState(sourceConns) };
  }, [nodes, connections]);

  // Paste from clipboard
  const pasteNodes = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;

    const { nodes: clipNodes, connections: clipConns } = clipboardRef.current;
    const idMap = new Map<string, string>();
    const portMap = new Map<string, string>();

    const newNodes: CanvasNode[] = clipNodes.map((node) => {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
      const newPorts = node.type === 'freetext' ? [] : createDefaultPorts();
      // Map old port ids to new ones
      node.ports.forEach((oldPort, i) => {
        if (newPorts[i]) portMap.set(oldPort.id, newPorts[i].id);
      });
      return {
        ...cloneState(node),
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        ports: newPorts,
      };
    });

    const newConnections: Connection[] = [];
    clipConns.forEach((conn) => {
      const newFromId = idMap.get(conn.fromNodeId);
      const newToId = idMap.get(conn.toNodeId);
      const newFromPort = portMap.get(conn.fromPortId);
      const newToPort = portMap.get(conn.toPortId);
      if (newFromId && newToId && newFromPort && newToPort) {
        newConnections.push({
          ...conn,
          id: crypto.randomUUID(),
          fromNodeId: newFromId,
          fromPortId: newFromPort,
          toNodeId: newToId,
          toPortId: newToPort,
        });
      }
    });

    setNodes((prevNodes) => {
      const nextNodes = [...prevNodes, ...newNodes];
      setConnections((prevConns) => {
        const nextConns = [...prevConns, ...newConnections];
        pushHistory(nextNodes, nextConns);
        return nextConns;
      });
      return nextNodes;
    });

    // Update clipboard positions so next paste offsets further
    clipboardRef.current = {
      nodes: clipboardRef.current.nodes.map((n) => ({
        ...n,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
      })),
      connections: clipboardRef.current.connections,
    };

    setSelectedNodeIds(new Set(newNodes.map((n) => n.id)));
  }, [pushHistory]);

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

  // Center view on existing content
  const centerOnContent = useCallback(() => {
    if (nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const centerX = minX + contentWidth / 2;
    const centerY = minY + contentHeight / 2;

    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    // Fit content with padding
    const padding = 100;
    const scaleX = (viewWidth - padding * 2) / contentWidth;
    const scaleY = (viewHeight - padding * 2) / contentHeight;
    const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.5);

    setZoom(fitZoom);
    setOffset({
      x: viewWidth / 2 - centerX * fitZoom,
      y: viewHeight / 2 - centerY * fitZoom,
    });
  }, [nodes]);

  return {
    nodes,
    connections,
    offset,
    zoom,
    selectedNodeIds,
    setOffset,
    setZoom,
    setSelectedNodeIds,
    addNode,
    addNodeAt,
    updateNode,
    deleteNode,
    duplicateNode,
    duplicateNodes,
    copyNodes,
    pasteNodes,
    addConnection,
    deleteConnection,
    updateConnectionColor,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetView,
    centerOnContent,
  };
}
