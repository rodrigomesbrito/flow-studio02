import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasState } from '@/hooks/useCanvasState';
import { useCanvasTools } from '@/contexts/CanvasToolsContext';
import { BottomToolbar } from './BottomToolbar';
import { NodeCard } from './NodeCard';
import { FreeTextNode } from './FreeTextNode';
import { ChecklistNode } from './ChecklistNode';
import { FrameNode } from './FrameNode';
import { ConnectionLines } from './ConnectionLines';
import { Position, CanvasTool, NodeType, CanvasNode, Connection } from '@/types/canvas';
import { DEFAULT_EDGE_COLOR } from './connection-utils';
import { useCanvasData } from '@/hooks/useCanvasData';
import { SaveIndicator } from './SaveIndicator';
import { getHandleWorldPosition, findClosestCompatibleHandle, HANDLE_HIT_RADIUS } from './connection-utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Type, Image, CheckSquare, Frame } from 'lucide-react';

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Grouping types
interface NodeGroup {
  id: string;
  nodeIds: Set<string>;
}

// Snap / alignment types
interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number; // canvas coordinate
  start: number;
  end: number;
}

const GRID_SIZE = 24;
const GRID_SNAP_THRESHOLD = 8;
const ALIGN_SNAP_THRESHOLD = 6;

function snapToGrid(value: number): number {
  const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
  return Math.abs(value - snapped) < GRID_SNAP_THRESHOLD ? snapped : value;
}

interface InfiniteCanvasProps {
  canvasId?: string;
}

export function InfiniteCanvas({ canvasId }: InfiniteCanvasProps) {
  const handleDataChange = useCallback((nodes: CanvasNode[], connections: Connection[]) => {
    saveToDb(nodes, connections);
  }, []);

  const {
    nodes, connections, offset, zoom, selectedNodeIds,
    setOffset, setZoom, setSelectedNodeIds,
    loadData,
    addNode, addNodeAt, updateNode, deleteNode, duplicateNode, duplicateNodes,
    copyNodes, pasteNodes,
    addConnection, deleteConnection, updateConnectionColor,
    undo, redo, zoomIn, zoomOut, resetView, centerOnContent,
  } = useCanvasState(handleDataChange);

  const { save: saveToDb } = useCanvasData(canvasId, loadData);

  // Fix: update the callback ref after saveToDb is available
  useEffect(() => {
    // no-op, the ref in useCanvasState picks up changes automatically
  }, [saveToDb]);

  const { registerAddNode, unregisterAddNode } = useCanvasTools();

  useEffect(() => {
    registerAddNode(addNode);
    return () => unregisterAddNode();
  }, [addNode, registerAddNode, unregisterAddNode]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>('cursor');
  const [isPanning, setIsPanning] = useState(false);
  const [highlightedTargetHandleId, setHighlightedTargetHandleId] = useState<string | null>(null);
  const panStart = useRef<Position>({ x: 0, y: 0 });
  const offsetStart = useRef<Position>({ x: 0, y: 0 });

  // Single or group drag
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const nodeStartPositions = useRef<Map<string, Position>>(new Map());

  // Alt+drag duplicate
  const altDragDuplicated = useRef(false);

  // Marquee selection
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const isMarqueeActive = useRef(false);

  const [tempConnection, setTempConnection] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);
  const connectionDragRef = useRef<{ nodeId: string; portId: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Space key temporary pan
  const [spaceHeld, setSpaceHeld] = useState(false);
  const toolBeforeSpace = useRef<CanvasTool>('cursor');

  // Track newly created freetext node for auto-edit
  const [autoEditNodeId, setAutoEditNodeId] = useState<string | null>(null);

  // Grouping
  const [groups, setGroups] = useState<NodeGroup[]>([]);

  // Alignment guides
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // Context menu position (canvas coords)
  const contextMenuCanvasPos = useRef<Position>({ x: 0, y: 0 });

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  const activeSourceHandleId = connectionDragRef.current?.portId ?? null;

  const effectiveTool = spaceHeld ? 'hand' : activeTool;

  // Build a map of portId → connection color for connected ports
  const portColorMap = useMemo(() => {
    const map = new Map<string, string>();
    connections.forEach((conn) => {
      const color = conn.color || DEFAULT_EDGE_COLOR;
      map.set(conn.fromPortId, color);
      map.set(conn.toPortId, color);
    });
    return map;
  }, [connections]);

  // Center on content when nodes first appear
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (nodes.length > 0 && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      centerOnContent();
    }
  }, [nodes.length, centerOnContent]);

  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (selectionBox) return 'crosshair';
    if (effectiveTool === 'hand') return 'grab';
    if (effectiveTool === 'connect') return 'crosshair';
    return 'default';
  };

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - offset.x) / zoom,
      y: (clientY - rect.top - offset.y) / zoom,
    };
  }, [offset, zoom]);

  const beginPan = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    panStart.current = { x: clientX, y: clientY };
    offsetStart.current = { ...offset };
  }, [offset]);

  // Double-click on canvas background to create freetext
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isBackground = target === canvasRef.current || target === canvasRef.current?.firstElementChild;
    if (!isBackground) return;
    if (effectiveTool !== 'cursor') return;

    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const nodeId = addNodeAt('freetext', canvasPos);
    setAutoEditNodeId(nodeId);
  }, [effectiveTool, screenToCanvas, addNodeAt]);

  // Context menu: add node at right-click position
  const handleContextMenuAdd = useCallback((type: NodeType) => {
    const pos = contextMenuCanvasPos.current;
    addNodeAt(type, pos);
  }, [addNodeAt]);

  // Grouping: Ctrl+G to group selected, Ctrl+Shift+G to ungroup
  const groupSelected = useCallback(() => {
    if (selectedNodeIds.size < 2) return;
    const newGroup: NodeGroup = {
      id: crypto.randomUUID(),
      nodeIds: new Set(selectedNodeIds),
    };
    setGroups(prev => {
      const cleaned = prev.map(g => ({
        ...g,
        nodeIds: new Set([...g.nodeIds].filter(id => !selectedNodeIds.has(id))),
      })).filter(g => g.nodeIds.size > 1);
      return [...cleaned, newGroup];
    });
  }, [selectedNodeIds]);

  const ungroupSelected = useCallback(() => {
    if (selectedNodeIds.size === 0) return;
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        nodeIds: new Set([...g.nodeIds].filter(id => !selectedNodeIds.has(id))),
      })).filter(g => g.nodeIds.size > 1)
    );
  }, [selectedNodeIds]);

  // Find all nodes in the same group as a given node
  const getGroupMembers = useCallback((nodeId: string): Set<string> => {
    for (const group of groups) {
      if (group.nodeIds.has(nodeId)) {
        return group.nodeIds;
      }
    }
    return new Set([nodeId]);
  }, [groups]);

  // Compute alignment snap + guides
  const computeSnapAndGuides = useCallback((
    primaryNodeId: string,
    rawX: number,
    rawY: number,
    draggedIds: Set<string>
  ): { snappedX: number; snappedY: number; guides: AlignmentGuide[] } => {
    const primaryNode = nodesRef.current.find(n => n.id === primaryNodeId);
    if (!primaryNode) return { snappedX: rawX, snappedY: rawY, guides: [] };

    const w = primaryNode.size.width;
    const h = primaryNode.size.height;

    // Edges and center of the dragged node
    const myLeft = rawX;
    const myRight = rawX + w;
    const myCenterX = rawX + w / 2;
    const myTop = rawY;
    const myBottom = rawY + h;
    const myCenterY = rawY + h / 2;

    // Gather reference edges from other nodes
    const otherNodes = nodesRef.current.filter(n => !draggedIds.has(n.id));

    let bestDx = Infinity;
    let bestDy = Infinity;
    let snapX = rawX;
    let snapY = rawY;
    const guides: AlignmentGuide[] = [];

    for (const other of otherNodes) {
      const oLeft = other.position.x;
      const oRight = other.position.x + other.size.width;
      const oCenterX = other.position.x + other.size.width / 2;
      const oTop = other.position.y;
      const oBottom = other.position.y + other.size.height;
      const oCenterY = other.position.y + other.size.height / 2;

      // Vertical alignment (snap X)
      const xPairs = [
        { my: myLeft, ref: oLeft },
        { my: myLeft, ref: oRight },
        { my: myRight, ref: oLeft },
        { my: myRight, ref: oRight },
        { my: myCenterX, ref: oCenterX },
        { my: myLeft, ref: oCenterX },
        { my: myRight, ref: oCenterX },
        { my: myCenterX, ref: oLeft },
        { my: myCenterX, ref: oRight },
      ];

      for (const pair of xPairs) {
        const diff = Math.abs(pair.my - pair.ref);
        if (diff < ALIGN_SNAP_THRESHOLD && diff < Math.abs(bestDx)) {
          bestDx = pair.ref - pair.my;
        }
      }

      // Horizontal alignment (snap Y)
      const yPairs = [
        { my: myTop, ref: oTop },
        { my: myTop, ref: oBottom },
        { my: myBottom, ref: oTop },
        { my: myBottom, ref: oBottom },
        { my: myCenterY, ref: oCenterY },
        { my: myTop, ref: oCenterY },
        { my: myBottom, ref: oCenterY },
        { my: myCenterY, ref: oTop },
        { my: myCenterY, ref: oBottom },
      ];

      for (const pair of yPairs) {
        const diff = Math.abs(pair.my - pair.ref);
        if (diff < ALIGN_SNAP_THRESHOLD && diff < Math.abs(bestDy)) {
          bestDy = pair.ref - pair.my;
        }
      }
    }

    if (Math.abs(bestDx) < ALIGN_SNAP_THRESHOLD) {
      snapX = rawX + bestDx;
    } else {
      snapX = snapToGrid(rawX);
    }

    if (Math.abs(bestDy) < ALIGN_SNAP_THRESHOLD) {
      snapY = rawY + bestDy;
    } else {
      snapY = snapToGrid(rawY);
    }

    // Build guide lines for snapped positions
    const finalLeft = snapX;
    const finalRight = snapX + w;
    const finalCenterX = snapX + w / 2;
    const finalTop = snapY;
    const finalBottom = snapY + h;
    const finalCenterY = snapY + h / 2;

    for (const other of otherNodes) {
      const oLeft = other.position.x;
      const oRight = other.position.x + other.size.width;
      const oCenterX = other.position.x + other.size.width / 2;
      const oTop = other.position.y;
      const oBottom = other.position.y + other.size.height;
      const oCenterY = other.position.y + other.size.height / 2;

      // Vertical guides
      const vEdges = [finalLeft, finalRight, finalCenterX];
      const oVEdges = [oLeft, oRight, oCenterX];
      for (const ve of vEdges) {
        for (const ov of oVEdges) {
          if (Math.abs(ve - ov) < 1) {
            const minY = Math.min(finalTop, oTop);
            const maxY = Math.max(finalBottom, oBottom);
            guides.push({ type: 'vertical', position: ve, start: minY, end: maxY });
          }
        }
      }

      // Horizontal guides
      const hEdges = [finalTop, finalBottom, finalCenterY];
      const oHEdges = [oTop, oBottom, oCenterY];
      for (const he of hEdges) {
        for (const oh of oHEdges) {
          if (Math.abs(he - oh) < 1) {
            const minX = Math.min(finalLeft, oLeft);
            const maxX = Math.max(finalRight, oRight);
            guides.push({ type: 'horizontal', position: he, start: minX, end: maxX });
          }
        }
      }
    }

    return { snappedX: snapX, snappedY: snapY, guides };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      beginPan(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const isBackground = target === canvasRef.current || target === canvasRef.current?.firstElementChild;

    if (isBackground && effectiveTool === 'hand') {
      beginPan(e.clientX, e.clientY);
      return;
    }

    if (isBackground && effectiveTool === 'cursor') {
      // Start marquee selection
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setSelectionBox({ startX: canvasPos.x, startY: canvasPos.y, currentX: canvasPos.x, currentY: canvasPos.y });
      isMarqueeActive.current = true;
      if (!e.shiftKey) {
        setSelectedNodeIds(new Set());
      }
      setSelectedConnectionId(null);
      return;
    }

    if (isBackground) {
      setSelectedNodeIds(new Set());
      setSelectedConnectionId(null);
    }
  }, [effectiveTool, beginPan, setSelectedNodeIds, screenToCanvas]);

  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    if (isPanning) {
      setOffset({
        x: offsetStart.current.x + (clientX - panStart.current.x),
        y: offsetStart.current.y + (clientY - panStart.current.y),
      });
    }

    // Marquee selection
    if (isMarqueeActive.current) {
      const canvasPos = screenToCanvas(clientX, clientY);
      setSelectionBox((prev) => prev ? { ...prev, currentX: canvasPos.x, currentY: canvasPos.y } : null);
      return;
    }

    // Group drag with snap
    if (draggingNodeId) {
      const dx = (clientX - dragStart.current.x) / zoom;
      const dy = (clientY - dragStart.current.y) / zoom;

      const primaryStart = nodeStartPositions.current.get(draggingNodeId);
      if (primaryStart) {
        const rawX = primaryStart.x + dx;
        const rawY = primaryStart.y + dy;
        const draggedIds = new Set(nodeStartPositions.current.keys());

        const { snappedX, snappedY, guides } = computeSnapAndGuides(draggingNodeId, rawX, rawY, draggedIds);
        const snapDx = snappedX - primaryStart.x;
        const snapDy = snappedY - primaryStart.y;

        nodeStartPositions.current.forEach((startPos, nodeId) => {
          updateNode(nodeId, {
            position: { x: startPos.x + snapDx, y: startPos.y + snapDy }
          });
        });

        setAlignmentGuides(guides);
      }
    }

    if (connectionDragRef.current) {
      const sourceNode = nodesRef.current.find((node) => node.id === connectionDragRef.current?.nodeId);
      if (sourceNode) {
        const fromPos = getHandleWorldPosition(sourceNode, connectionDragRef.current.portId);
        if (fromPos) {
          const toPos = screenToCanvas(clientX, clientY);
          const hitTarget = findClosestCompatibleHandle({
            nodes: nodesRef.current,
            sourceNodeId: connectionDragRef.current.nodeId,
            sourceHandleId: connectionDragRef.current.portId,
            point: toPos,
            maxDistance: HANDLE_HIT_RADIUS / zoom,
          });

          setHighlightedTargetHandleId(hitTarget?.handle.id ?? null);
          setTempConnection({
            fromX: fromPos.x,
            fromY: fromPos.y,
            toX: hitTarget?.position.x ?? toPos.x,
            toY: hitTarget?.position.y ?? toPos.y,
          });
        }
      }
    }
  }, [draggingNodeId, isPanning, screenToCanvas, setOffset, updateNode, zoom, computeSnapAndGuides]);

  const finishMarqueeSelection = useCallback(() => {
    if (!isMarqueeActive.current) return;
    isMarqueeActive.current = false;

    setSelectionBox((box) => {
      if (!box) return null;
      const minX = Math.min(box.startX, box.currentX);
      const minY = Math.min(box.startY, box.currentY);
      const maxX = Math.max(box.startX, box.currentX);
      const maxY = Math.max(box.startY, box.currentY);
      const w = maxX - minX;
      const h = maxY - minY;
      if (w < 5 && h < 5) return null;

      const hitIds = new Set<string>();
      nodesRef.current.forEach((node) => {
        const nx = node.position.x;
        const ny = node.position.y;
        const nw = node.size.width;
        const nh = node.size.height;

        if (nx + nw > minX && nx < maxX && ny + nh > minY && ny < maxY) {
          hitIds.add(node.id);
        }
      });

      if (hitIds.size > 0) {
        setSelectedNodeIds((prev) => {
          const next = new Set(prev);
          hitIds.forEach((id) => next.add(id));
          return next;
        });
      }

      return null;
    });
  }, [setSelectedNodeIds]);

  const resetConnectionDrag = useCallback(() => {
    connectionDragRef.current = null;
    setIsConnecting(false);
    setTempConnection(null);
    setHighlightedTargetHandleId(null);
  }, []);

  const finishConnectionDrag = useCallback((clientX: number, clientY: number) => {
    if (!connectionDragRef.current) return;

    const canvasPoint = screenToCanvas(clientX, clientY);
    const hitTarget = findClosestCompatibleHandle({
      nodes: nodesRef.current,
      sourceNodeId: connectionDragRef.current.nodeId,
      sourceHandleId: connectionDragRef.current.portId,
      point: canvasPoint,
      maxDistance: HANDLE_HIT_RADIUS / zoom,
    });

    if (hitTarget) {
      addConnection(
        connectionDragRef.current.nodeId,
        connectionDragRef.current.portId,
        hitTarget.nodeId,
        hitTarget.handle.id,
      );
    }

    resetConnectionDrag();
  }, [addConnection, resetConnectionDrag, screenToCanvas, zoom]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    handleMouseMove(e.clientX, e.clientY);
  }, [handleMouseMove]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setAlignmentGuides([]);
    altDragDuplicated.current = false;
    finishMarqueeSelection();
    finishConnectionDrag(e.clientX, e.clientY);
  }, [finishConnectionDrag, finishMarqueeSelection]);

  useEffect(() => {
    const isActive = Boolean(draggingNodeId || isConnecting || isPanning || isMarqueeActive.current);
    if (!isActive) return;

    const handleWindowMouseMove = (e: MouseEvent) => handleMouseMove(e.clientX, e.clientY);
    const handleWindowMouseUp = (e: MouseEvent) => {
      setIsPanning(false);
      setDraggingNodeId(null);
      setAlignmentGuides([]);
      altDragDuplicated.current = false;
      finishMarqueeSelection();
      finishConnectionDrag(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingNodeId, isConnecting, finishConnectionDrag, finishMarqueeSelection, handleMouseMove, isPanning]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.2, zoom * delta));
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setOffset({
      x: mouseX - (mouseX - offset.x) * (newZoom / zoom),
      y: mouseY - (mouseY - offset.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  }, [zoom, offset, setOffset, setZoom]);

  // Check if a node is inside a frame
  const getNodesInsideFrame = useCallback((frameId: string): string[] => {
    const frame = nodes.find(n => n.id === frameId);
    if (!frame || frame.type !== 'frame') return [];
    
    return nodes
      .filter(n => n.id !== frameId && n.type !== 'frame')
      .filter(n => {
        const nx = n.position.x;
        const ny = n.position.y;
        return (
          nx >= frame.position.x &&
          ny >= frame.position.y &&
          nx + n.size.width <= frame.position.x + frame.size.width &&
          ny + n.size.height <= frame.position.y + frame.size.height
        );
      })
      .map(n => n.id);
  }, [nodes]);

  const handleNodeDragStart = useCallback((nodeId: string, startMouse: Position, altKey?: boolean) => {
    if (effectiveTool === 'hand') return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    // Don't drag locked nodes
    if (node.locked) return;

    // Determine which nodes to drag — include group members
    let dragging: Set<string>;
    if (selectedNodeIds.has(nodeId)) {
      dragging = new Set(selectedNodeIds);
    } else {
      dragging = getGroupMembers(nodeId);
    }

    // Also expand to include all group members of any selected node
    const expanded = new Set(dragging);
    dragging.forEach(id => {
      const members = getGroupMembers(id);
      members.forEach(m => expanded.add(m));
    });
    dragging = expanded;

    // If dragging a frame, include all nodes inside it
    dragging.forEach(id => {
      const n = nodes.find(item => item.id === id);
      if (n?.type === 'frame') {
        const children = getNodesInsideFrame(id);
        children.forEach(childId => dragging.add(childId));
      }
    });

    // Remove locked nodes from drag set
    const unlocked = new Set<string>();
    dragging.forEach(id => {
      const n = nodes.find(item => item.id === id);
      if (n && !n.locked) unlocked.add(id);
    });
    dragging = unlocked;
    if (dragging.size === 0) return;

    // Alt+drag: duplicate first, then drag the duplicates
    if (altKey && !altDragDuplicated.current) {
      altDragDuplicated.current = true;
      const idMap = duplicateNodes(dragging, { x: 0, y: 0 });
      const newIds = new Set(Array.from(dragging).map((id) => idMap.get(id) || id));
      dragging = newIds;
      setSelectedNodeIds(newIds);

      nodeStartPositions.current = new Map();
      const latestNodes = nodesRef.current;
      newIds.forEach((id) => {
        const n = latestNodes.find((item) => item.id === id);
        if (n) nodeStartPositions.current.set(id, { ...n.position });
      });

      setDraggingNodeId(Array.from(newIds)[0]);
      dragStart.current = startMouse;
      return;
    }

    // Store start positions for all dragged nodes
    nodeStartPositions.current = new Map();
    dragging.forEach((id) => {
      const n = nodes.find((item) => item.id === id);
      if (n) nodeStartPositions.current.set(id, { ...n.position });
    });

    if (!selectedNodeIds.has(nodeId)) {
      setSelectedNodeIds(dragging);
    }

    setDraggingNodeId(nodeId);
    dragStart.current = startMouse;
  }, [effectiveTool, nodes, selectedNodeIds, setSelectedNodeIds, duplicateNodes, getGroupMembers, getNodesInsideFrame]);

  const handlePortDragStart = useCallback((nodeId: string, portId: string) => {
    if (effectiveTool === 'hand') return;
    connectionDragRef.current = { nodeId, portId };
    setIsConnecting(true);
    const sourceNode = nodesRef.current.find((node) => node.id === nodeId);
    if (!sourceNode) return;

    const fromPos = getHandleWorldPosition(sourceNode, portId);
    if (!fromPos) return;

    setSelectedNodeIds(new Set([nodeId]));
    setSelectedConnectionId(null);
    setHighlightedTargetHandleId(null);
    setTempConnection({ fromX: fromPos.x, fromY: fromPos.y, toX: fromPos.x, toY: fromPos.y });
  }, [effectiveTool, setSelectedNodeIds]);

  const handleNodeSelect = useCallback((nodeId: string, e?: React.MouseEvent) => {
    setSelectedConnectionId(null);
    if (e?.shiftKey) {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    } else {
      // Select node + all group members
      const members = getGroupMembers(nodeId);
      setSelectedNodeIds(members);
    }
  }, [setSelectedNodeIds, getGroupMembers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.code === 'Space' && !isInput && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
        toolBeforeSpace.current = activeTool;
        return;
      }

      if (isInput) return;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
          setSelectedConnectionId(null);
        } else if (selectedNodeIds.size > 0) {
          selectedNodeIds.forEach((id) => deleteNode(id));
          setSelectedNodeIds(new Set());
        }
      }

      // Ctrl+A select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(nodesRef.current.map(n => n.id));
        setSelectedNodeIds(allIds);
      }

      // Ctrl+Z / Ctrl+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }

      // Ctrl+C copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedNodeIds.size > 0) {
          copyNodes(selectedNodeIds);
        }
      }

      // Ctrl+V paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        pasteNodes();
      }

      // Ctrl+G group
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
      }

      // Ctrl+Shift+G ungroup
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
      }

      // Tool shortcuts (only without modifiers)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') setActiveTool('cursor');
        if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
        if (e.key === 'c' || e.key === 'C') setActiveTool('connect');
        if (e.key === 't' || e.key === 'T') addNode('text');
        if (e.key === 'i' || e.key === 'I') addNode('image');
      }

      if (e.key === 'Escape') {
        resetConnectionDrag();
        setSelectedNodeIds(new Set());
        setSelectedConnectionId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeIds, selectedConnectionId, deleteNode, deleteConnection, undo, redo, setSelectedNodeIds, resetConnectionDrag, activeTool, addNode, copyNodes, pasteNodes, groupSelected, ungroupSelected]);

  // Compute marquee box in screen coords for the overlay
  const marqueeStyle = selectionBox ? (() => {
    const minX = Math.min(selectionBox.startX, selectionBox.currentX);
    const minY = Math.min(selectionBox.startY, selectionBox.currentY);
    return {
      left: minX,
      top: minY,
      width: Math.abs(selectionBox.currentX - selectionBox.startX),
      height: Math.abs(selectionBox.currentY - selectionBox.startY),
    };
  })() : null;

  // Track right-click position for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    contextMenuCanvasPos.current = screenToCanvas(e.clientX, e.clientY);
  }, [screenToCanvas]);

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={canvasRef}
            className="absolute inset-0 canvas-grid overflow-hidden"
            style={{ cursor: getCursorStyle() }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onDoubleClick={handleCanvasDoubleClick}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
          >
            <div
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              <ConnectionLines
                connections={connections}
                nodes={nodes}
                tempConnection={tempConnection}
                selectedConnectionId={selectedConnectionId}
                onSelectConnection={setSelectedConnectionId}
                onUpdateConnectionColor={updateConnectionColor}
                onDeleteConnection={(id) => {
                  deleteConnection(id);
                  setSelectedConnectionId(null);
                }}
              />

              {/* Alignment guide lines */}
              {alignmentGuides.length > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ overflow: 'visible', zIndex: 9999 }}
                >
                  {alignmentGuides.map((guide, i) => (
                    guide.type === 'vertical' ? (
                      <line
                        key={i}
                        x1={guide.position}
                        y1={guide.start - 20}
                        x2={guide.position}
                        y2={guide.end + 20}
                        stroke="hsl(270 60% 65%)"
                        strokeWidth={1 / zoom}
                        strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                        opacity={0.6}
                      />
                    ) : (
                      <line
                        key={i}
                        x1={guide.start - 20}
                        y1={guide.position}
                        x2={guide.end + 20}
                        y2={guide.position}
                        stroke="hsl(270 60% 65%)"
                        strokeWidth={1 / zoom}
                        strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                        opacity={0.6}
                      />
                    )
                  ))}
                </svg>
              )}

              {/* Marquee selection box */}
              {marqueeStyle && (
                <div
                  className="absolute border border-primary/60 bg-primary/10 pointer-events-none"
                  style={{
                    left: marqueeStyle.left,
                    top: marqueeStyle.top,
                    width: marqueeStyle.width,
                    height: marqueeStyle.height,
                  }}
                />
              )}

              {/* Render frames first (behind other nodes) */}
              {nodes.filter(n => n.type === 'frame').map((node) => (
                <FrameNode
                  key={node.id}
                  node={node}
                  zoom={zoom}
                  isSelected={selectedNodeIds.has(node.id)}
                  onSelect={(e) => handleNodeSelect(node.id, e)}
                  onUpdate={(updates) => updateNode(node.id, updates)}
                  onDelete={() => deleteNode(node.id)}
                  onDragStart={handleNodeDragStart}
                />
              ))}

              {/* Render non-frame nodes on top */}
              {nodes.filter(n => n.type !== 'frame').map((node) =>
                node.type === 'freetext' ? (
                  <FreeTextNode
                    key={node.id}
                    node={node}
                    zoom={zoom}
                    isSelected={selectedNodeIds.has(node.id)}
                    autoEdit={autoEditNodeId === node.id}
                    onAutoEditConsumed={() => setAutoEditNodeId(null)}
                    onSelect={(e) => handleNodeSelect(node.id, e)}
                    onUpdate={(updates) => updateNode(node.id, updates)}
                    onDelete={() => deleteNode(node.id)}
                    onDragStart={handleNodeDragStart}
                  />
                ) : node.type === 'checklist' ? (
                  <ChecklistNode
                    key={node.id}
                    node={node}
                    zoom={zoom}
                    isSelected={selectedNodeIds.has(node.id)}
                    activeSourceHandleId={activeSourceHandleId}
                    highlightedTargetHandleId={highlightedTargetHandleId}
                    portColors={portColorMap}
                    onSelect={(e) => handleNodeSelect(node.id, e)}
                    onUpdate={(updates) => updateNode(node.id, updates)}
                    onDelete={() => deleteNode(node.id)}
                    onDragStart={handleNodeDragStart}
                    onPortDragStart={handlePortDragStart}
                  />
                ) : (
                  <NodeCard
                    key={node.id}
                    node={node}
                    zoom={zoom}
                    isSelected={selectedNodeIds.has(node.id)}
                    activeSourceHandleId={activeSourceHandleId}
                    highlightedTargetHandleId={highlightedTargetHandleId}
                    portColors={portColorMap}
                    onSelect={(e) => handleNodeSelect(node.id, e)}
                    onUpdate={(updates) => updateNode(node.id, updates)}
                    onDelete={() => deleteNode(node.id)}
                    onDuplicate={() => duplicateNode(node.id)}
                    onDragStart={handleNodeDragStart}
                    onPortDragStart={handlePortDragStart}
                  />
                )
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-card/95 backdrop-blur-xl border-border">
          <ContextMenuItem onClick={() => handleContextMenuAdd('text')} className="gap-2 text-foreground">
            <Type size={14} className="text-muted-foreground" />
            Adicionar texto
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleContextMenuAdd('image')} className="gap-2 text-foreground">
            <Image size={14} className="text-muted-foreground" />
            Adicionar imagem
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleContextMenuAdd('checklist')} className="gap-2 text-foreground">
            <CheckSquare size={14} className="text-muted-foreground" />
            Adicionar checklist
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => handleContextMenuAdd('frame')} className="gap-2 text-foreground">
            <Frame size={14} className="text-muted-foreground" />
            Adicionar frame
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <BottomToolbar
        zoom={zoom}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
  );
}
