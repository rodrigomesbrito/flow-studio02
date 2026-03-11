import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasState } from '@/hooks/useCanvasState';
import { useCanvasTools } from '@/contexts/CanvasToolsContext';
import { BottomToolbar } from './BottomToolbar';
import { NodeCard } from './NodeCard';
import { FreeTextNode } from './FreeTextNode';
import { ConnectionLines } from './ConnectionLines';
import { Position, CanvasTool } from '@/types/canvas';
import { DEFAULT_EDGE_COLOR } from './connection-utils';
import { getHandleWorldPosition, findClosestCompatibleHandle, HANDLE_HIT_RADIUS } from './connection-utils';

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function getBoxRect(box: SelectionBox) {
  return {
    x: Math.min(box.startX, box.currentX),
    y: Math.min(box.startY, box.currentY),
    width: Math.abs(box.currentX - box.startX),
    height: Math.abs(box.currentY - box.startY),
  };
}

export function InfiniteCanvas() {
  const {
    nodes, connections, offset, zoom, selectedNodeIds,
    setOffset, setZoom, setSelectedNodeIds,
    addNode, updateNode, deleteNode, duplicateNode,
    addConnection, deleteConnection, updateConnectionColor,
    undo, redo, zoomIn, zoomOut, resetView,
  } = useCanvasState();

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

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

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

    // Group drag
    if (draggingNodeId) {
      const dx = (clientX - dragStart.current.x) / zoom;
      const dy = (clientY - dragStart.current.y) / zoom;
      
      // Move all selected nodes together
      nodeStartPositions.current.forEach((startPos, nodeId) => {
        updateNode(nodeId, {
          position: { x: startPos.x + dx, y: startPos.y + dy }
        });
      });
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
  }, [draggingNodeId, isPanning, screenToCanvas, setOffset, updateNode, zoom]);

  const finishMarqueeSelection = useCallback(() => {
    if (!isMarqueeActive.current) return;
    isMarqueeActive.current = false;

    setSelectionBox((box) => {
      if (!box) return null;
      const rect = getBoxRect(box);
      if (rect.width < 5 && rect.height < 5) return null; // too small, treat as click

      const hitIds = new Set<string>();
      nodesRef.current.forEach((node) => {
        const nx = node.position.x;
        const ny = node.position.y;
        const nw = node.size.width;
        const nh = node.size.height;

        // Check overlap
        if (
          nx + nw > rect.x &&
          nx < rect.x + rect.width &&
          ny + nh > rect.y &&
          ny < rect.y + rect.height
        ) {
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

  const handleNodeDragStart = useCallback((nodeId: string, startMouse: Position) => {
    if (effectiveTool === 'hand') return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    // Determine which nodes to drag
    const dragging = selectedNodeIds.has(nodeId) ? selectedNodeIds : new Set([nodeId]);
    
    // Store start positions for all dragged nodes
    nodeStartPositions.current = new Map();
    dragging.forEach((id) => {
      const n = nodes.find((item) => item.id === id);
      if (n) nodeStartPositions.current.set(id, { ...n.position });
    });

    // If clicking a non-selected node without shift, select only that node
    if (!selectedNodeIds.has(nodeId)) {
      setSelectedNodeIds(new Set([nodeId]));
    }

    setDraggingNodeId(nodeId);
    dragStart.current = startMouse;
  }, [effectiveTool, nodes, selectedNodeIds, setSelectedNodeIds]);

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
      setSelectedNodeIds(new Set([nodeId]));
    }
  }, [setSelectedNodeIds]);

  // Keyboard shortcuts including space-key panning
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

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
          setSelectedConnectionId(null);
        } else if (selectedNodeIds.size > 0) {
          selectedNodeIds.forEach((id) => deleteNode(id));
          setSelectedNodeIds(new Set());
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key === 'v' || e.key === 'V') setActiveTool('cursor');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) setActiveTool('connect');
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
  }, [selectedNodeIds, selectedConnectionId, deleteNode, deleteConnection, undo, redo, setSelectedNodeIds, resetConnectionDrag, activeTool]);

  // Compute marquee box in screen coords for the overlay
  const marqueeStyle = selectionBox ? (() => {
    const rect = getBoxRect(selectionBox);
    return {
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  })() : null;

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <div
        ref={canvasRef}
        className="absolute inset-0 canvas-grid overflow-hidden"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleWheel}
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

          {nodes.map((node) =>
            node.type === 'freetext' ? (
              <FreeTextNode
                key={node.id}
                node={node}
                zoom={zoom}
                isSelected={selectedNodeIds.has(node.id)}
                onSelect={(e) => handleNodeSelect(node.id, e)}
                onUpdate={(updates) => updateNode(node.id, updates)}
                onDelete={() => deleteNode(node.id)}
                onDragStart={handleNodeDragStart}
              />
            ) : (
              <NodeCard
                key={node.id}
                node={node}
                zoom={zoom}
                isSelected={selectedNodeIds.has(node.id)}
                activeSourceHandleId={activeSourceHandleId}
                highlightedTargetHandleId={highlightedTargetHandleId}
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
