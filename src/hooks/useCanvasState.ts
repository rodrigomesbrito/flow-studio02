import { useState, useCallback, useRef, useEffect } from 'react';
import { CanvasNode, Connection, Position, NodeType } from '@/types/canvas';
import { useCanvasHistory, type CanvasHistoryOptions, type CanvasSnapshot } from '@/hooks/canvas/useCanvasHistory';

const DEFAULT_CONNECTION_COLOR = '#a855f7';

const createDefaultPorts = () => [
  { id: crypto.randomUUID(), side: 'left' as const, type: 'input' as const },
  { id: crypto.randomUUID(), side: 'right' as const, type: 'output' as const },
  { id: crypto.randomUUID(), side: 'top' as const, type: 'input' as const },
  { id: crypto.randomUUID(), side: 'bottom' as const, type: 'output' as const },
];

const getNodeDefaults = (type: NodeType) => {
  switch (type) {
    case 'freetext':
      return { width: 240, height: 60, title: 'Texto livre' };
    case 'image':
      return { width: 280, height: 300, title: 'Image' };
    case 'checklist':
      return { width: 280, height: 220, title: 'Checklist' };
    case 'frame':
      return { width: 500, height: 400, title: 'Frame' };
    default:
      return { width: 320, height: 180, title: 'Text' };
  }
};

const NO_PORTS_TYPES: NodeType[] = ['freetext', 'frame'];

const createNode = (type: NodeType, position: Position): CanvasNode => {
  const defaults = getNodeDefaults(type);
  const initialContent = type === 'checklist'
    ? JSON.stringify([{ id: crypto.randomUUID(), text: '', checked: false }])
    : '';

  const node: CanvasNode = {
    id: crypto.randomUUID(),
    type,
    position,
    size: { width: defaults.width, height: defaults.height },
    title: defaults.title,
    content: initialContent,
    ports: NO_PORTS_TYPES.includes(type) ? [] : createDefaultPorts(),
  };
  if (type === 'freetext') {
    node.textStyle = { fontSize: 16, bold: false, italic: false, uppercase: false, textAlign: 'center' };
  }
  return node;
};

const cloneState = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function useCanvasState(onDataChange?: (nodes: CanvasNode[], connections: Connection[]) => void) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const hydratedRef = useRef(false);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const {
    beginAction,
    endAction,
    pushSnapshot,
    redo: redoHistory,
    reset,
    scheduleSnapshot,
    undo: undoHistory,
  } = useCanvasHistory();

  const applySnapshot = useCallback((snapshot: CanvasSnapshot) => {
    nodesRef.current = snapshot.nodes;
    connectionsRef.current = snapshot.connections;
    setNodes(snapshot.nodes);
    setConnections(snapshot.connections);
  }, []);

  const commitState = useCallback((
    nextNodes: CanvasNode[],
    nextConnections: Connection[],
    options: CanvasHistoryOptions = {},
  ) => {
    hydratedRef.current = true;
    applySnapshot({ nodes: nextNodes, connections: nextConnections });

    const historyMode = options.history ?? 'push';
    if (historyMode === 'push') {
      pushSnapshot({ nodes: nextNodes, connections: nextConnections });
      return;
    }

    if (historyMode === 'debounced') {
      scheduleSnapshot({ nodes: nextNodes, connections: nextConnections }, options.debounceMs);
    }
  }, [applySnapshot, pushSnapshot, scheduleSnapshot]);

  // Load initial data from outside
  const loadData = useCallback((initialNodes: CanvasNode[], initialConnections: Connection[]) => {
    hydratedRef.current = true;
    applySnapshot({ nodes: initialNodes, connections: initialConnections });
    reset({ nodes: initialNodes, connections: initialConnections });
  }, [applySnapshot, reset]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    onDataChangeRef.current?.(nodes, connections);
  }, [nodes, connections]);

  // Clipboard for copy/paste
  const clipboardRef = useRef<{ nodes: CanvasNode[]; connections: Connection[] } | null>(null);

  const beginHistoryAction = useCallback(() => {
    beginAction({ nodes: nodesRef.current, connections: connectionsRef.current });
  }, [beginAction]);

  const endHistoryAction = useCallback(() => {
    endAction({ nodes: nodesRef.current, connections: connectionsRef.current });
  }, [endAction]);

  const addNode = useCallback((type: NodeType) => {
    const centerX = (-offset.x + window.innerWidth / 2) / zoom - 160;
    const centerY = (-offset.y + window.innerHeight / 2) / zoom - 100;
    const node = createNode(type, { x: centerX, y: centerY });

    commitState([...nodesRef.current, node], connectionsRef.current, { history: 'push' });
    setSelectedNodeIds(new Set([node.id]));
    return node.id;
  }, [commitState, offset.x, offset.y, zoom]);

  // Add node at specific canvas position (for double-click)
  const addNodeAt = useCallback((type: NodeType, position: Position) => {
    const defaults = getNodeDefaults(type);
    const node = createNode(type, {
      x: position.x - defaults.width / 2,
      y: position.y - defaults.height / 2,
    });

    commitState([...nodesRef.current, node], connectionsRef.current, { history: 'push' });
    setSelectedNodeIds(new Set([node.id]));
    return node.id;
  }, [commitState]);

  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>, options: CanvasHistoryOptions = { history: 'debounced', debounceMs: 250 }) => {
    const nextNodes = nodesRef.current.map((node) => (node.id === id ? { ...node, ...updates } : node));
    commitState(nextNodes, connectionsRef.current, options);
  }, [commitState]);

  const deleteNode = useCallback((id: string, options: CanvasHistoryOptions = { history: 'push' }) => {
    const nextNodes = nodesRef.current.filter((node) => node.id !== id);
    const nextConnections = connectionsRef.current.filter((connection) => connection.fromNodeId !== id && connection.toNodeId !== id);
    commitState(nextNodes, nextConnections, options);

    setSelectedNodeIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, [commitState]);

  const deleteNodes = useCallback((ids: Set<string>, options: CanvasHistoryOptions = { history: 'push' }) => {
    if (ids.size === 0) return;
    const nextNodes = nodesRef.current.filter((node) => !ids.has(node.id));
    const nextConnections = connectionsRef.current.filter((connection) => !ids.has(connection.fromNodeId) && !ids.has(connection.toNodeId));
    commitState(nextNodes, nextConnections, options);
    setSelectedNodeIds(new Set());
  }, [commitState]);

  const applyNodeUpdates = useCallback((updates: Array<{ id: string; updates: Partial<CanvasNode> }>, options: CanvasHistoryOptions = { history: 'push' }) => {
    if (updates.length === 0) return;
    const updatesMap = new Map(updates.map((item) => [item.id, item.updates]));
    const nextNodes = nodesRef.current.map((node) => {
      const nextUpdates = updatesMap.get(node.id);
      return nextUpdates ? { ...node, ...nextUpdates } : node;
    });
    commitState(nextNodes, connectionsRef.current, options);
  }, [commitState]);

  const duplicateNode = useCallback((id: string, options: CanvasHistoryOptions = { history: 'push' }) => {
    const node = nodesRef.current.find((item) => item.id === id);
    if (!node) return;

    const duplicatedNode: CanvasNode = {
      ...cloneState(node),
      id: crypto.randomUUID(),
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      ports: NO_PORTS_TYPES.includes(node.type) ? [] : createDefaultPorts(),
    };

    commitState([...nodesRef.current, duplicatedNode], connectionsRef.current, options);
    setSelectedNodeIds(new Set([duplicatedNode.id]));
  }, [commitState]);

  // Duplicate multiple nodes preserving relative positions
  const duplicateNodes = useCallback((
    ids: Set<string>,
    offsetDelta: Position = { x: 40, y: 40 },
    options: CanvasHistoryOptions = { history: 'push' },
  ) => {
    const sourceNodes = nodesRef.current.filter((n) => ids.has(n.id));
    if (sourceNodes.length === 0) return new Map<string, string>();

    const idMap = new Map<string, string>();
    const newNodes: CanvasNode[] = sourceNodes.map((node) => {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
      return {
        ...cloneState(node),
        id: newId,
        position: { x: node.position.x + offsetDelta.x, y: node.position.y + offsetDelta.y },
        ports: NO_PORTS_TYPES.includes(node.type) ? [] : createDefaultPorts(),
      };
    });

    const newConnections: Connection[] = [];
    connectionsRef.current.forEach((conn) => {
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

    commitState([...nodesRef.current, ...newNodes], [...connectionsRef.current, ...newConnections], options);
    setSelectedNodeIds(new Set(newNodes.map((n) => n.id)));
    return idMap;
  }, [commitState]);

  // Copy selected nodes to clipboard
  const copyNodes = useCallback((ids: Set<string>) => {
    const sourceNodes = nodesRef.current.filter((n) => ids.has(n.id));
    const sourceConns = connectionsRef.current.filter(
      (c) => ids.has(c.fromNodeId) && ids.has(c.toNodeId)
    );
    clipboardRef.current = { nodes: cloneState(sourceNodes), connections: cloneState(sourceConns) };
  }, []);

  // Paste from clipboard
  const pasteNodes = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;

    const { nodes: clipNodes, connections: clipConns } = clipboardRef.current;
    const idMap = new Map<string, string>();
    const portMap = new Map<string, string>();

    const newNodes: CanvasNode[] = clipNodes.map((node) => {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
      const newPorts = NO_PORTS_TYPES.includes(node.type) ? [] : createDefaultPorts();
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

    commitState([...nodesRef.current, ...newNodes], [...connectionsRef.current, ...newConnections], { history: 'push' });

    clipboardRef.current = {
      nodes: clipboardRef.current.nodes.map((n) => ({
        ...n,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
      })),
      connections: clipboardRef.current.connections,
    };

    setSelectedNodeIds(new Set(newNodes.map((n) => n.id)));
  }, [commitState]);

  const addConnection = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => {
    if (fromNodeId === toNodeId) return;

    const sourceNode = nodesRef.current.find((node) => node.id === fromNodeId);
    const targetNode = nodesRef.current.find((node) => node.id === toNodeId);
    const sourcePort = sourceNode?.ports.find((port) => port.id === fromPortId);
    const targetPort = targetNode?.ports.find((port) => port.id === toPortId);

    if (!sourceNode || !targetNode || !sourcePort || !targetPort) return;
    if (sourcePort.type !== 'output' || targetPort.type !== 'input') return;

    const exists = connectionsRef.current.some((connection) =>
      connection.fromNodeId === fromNodeId &&
      connection.fromPortId === fromPortId &&
      connection.toNodeId === toNodeId &&
      connection.toPortId === toPortId
    );

    if (exists) return;

    commitState(nodesRef.current, [
      ...connectionsRef.current,
      {
        id: crypto.randomUUID(),
        fromNodeId,
        fromPortId,
        toNodeId,
        toPortId,
        color: DEFAULT_CONNECTION_COLOR,
      },
    ], { history: 'push' });
  }, [commitState]);

  const deleteConnection = useCallback((id: string, options: CanvasHistoryOptions = { history: 'push' }) => {
    const nextConnections = connectionsRef.current.filter((connection) => connection.id !== id);
    commitState(nodesRef.current, nextConnections, options);
  }, [commitState]);

  const updateConnectionColor = useCallback((id: string, color: string, options: CanvasHistoryOptions = { history: 'push' }) => {
    const nextConnections = connectionsRef.current.map((connection) =>
      connection.id === id ? { ...connection, color } : connection,
    );
    commitState(nodesRef.current, nextConnections, options);
  }, [commitState]);

  const undo = useCallback(() => {
    const snapshot = undoHistory();
    if (!snapshot) return;
    applySnapshot(snapshot);
  }, [applySnapshot, undoHistory]);

  const redo = useCallback(() => {
    const snapshot = redoHistory();
    if (!snapshot) return;
    applySnapshot(snapshot);
  }, [applySnapshot, redoHistory]);

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
    loadData,
    beginHistoryAction,
    endHistoryAction,
    addNode,
    addNodeAt,
    updateNode,
    deleteNode,
    deleteNodes,
    applyNodeUpdates,
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
