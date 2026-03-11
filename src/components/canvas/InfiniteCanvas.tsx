import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvasState } from '@/hooks/useCanvasState';
import { CanvasSidebar } from './CanvasSidebar';
import { BottomToolbar } from './BottomToolbar';
import { NodeCard } from './NodeCard';
import { ConnectionLines } from './ConnectionLines';
import { Position, CanvasTool, Port } from '@/types/canvas';

export function InfiniteCanvas() {
  const {
    nodes, connections, offset, zoom, selectedNodeId,
    setOffset, setZoom, setSelectedNodeId,
    addNode, updateNode, deleteNode, duplicateNode,
    addConnection, deleteConnection, updateConnectionColor,
    undo, redo, zoomIn, zoomOut, resetView,
  } = useCanvasState();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>('cursor');
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<Position>({ x: 0, y: 0 });
  const offsetStart = useRef<Position>({ x: 0, y: 0 });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const nodeStartPos = useRef<Position>({ x: 0, y: 0 });

  const [tempConnection, setTempConnection] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);
  const connectionDrag = useRef<{ nodeId: string; portId: string } | null>(null);
  const hoveredInputPort = useRef<{ nodeId: string; portId: string } | null>(null);

  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'hand') return 'grab';
    if (activeTool === 'connect') return 'crosshair';
    return 'default';
  };

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / zoom,
      y: (clientY - rect.top - offset.y) / zoom,
    };
  }, [offset, zoom]);

  const getPortWorldPos = useCallback((nodeId: string, portId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const port = node.ports.find(p => p.id === portId);
    if (!port) return null;
    const { x, y } = node.position;
    const { width, height } = node.size;
    switch (port.side) {
      case 'left': return { x, y: y + height / 2 };
      case 'right': return { x: x + width, y: y + height / 2 };
      case 'top': return { x: x + width / 2, y };
      case 'bottom': return { x: x + width / 2, y: y + height };
      default: return null;
    }
  }, [nodes]);

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

    if (isBackground) {
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }

    if (activeTool === 'hand' && isBackground) {
      beginPan(e.clientX, e.clientY);
    }
  }, [activeTool, beginPan, setSelectedNodeId]);

  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    if (isPanning) {
      setOffset({
        x: offsetStart.current.x + (clientX - panStart.current.x),
        y: offsetStart.current.y + (clientY - panStart.current.y),
      });
    }

    if (draggingNodeId) {
      const dx = (clientX - dragStart.current.x) / zoom;
      const dy = (clientY - dragStart.current.y) / zoom;
      updateNode(draggingNodeId, {
        position: { x: nodeStartPos.current.x + dx, y: nodeStartPos.current.y + dy }
      });
    }

    if (connectionDrag.current) {
      const fromPos = getPortWorldPos(connectionDrag.current.nodeId, connectionDrag.current.portId);
      if (fromPos) {
        const toPos = screenToCanvas(clientX, clientY);
        setTempConnection({ fromX: fromPos.x, fromY: fromPos.y, toX: toPos.x, toY: toPos.y });
      }
    }
  }, [draggingNodeId, getPortWorldPos, isPanning, screenToCanvas, setOffset, updateNode, zoom]);

  const finishConnectionDrag = useCallback((clientX: number, clientY: number) => {
    if (!connectionDrag.current) return;

    let targetNodeId = hoveredInputPort.current?.nodeId ?? null;
    let targetPortId = hoveredInputPort.current?.portId ?? null;

    if (!targetNodeId || !targetPortId) {
      const hoveredElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const targetPort = hoveredElement?.closest('[data-port-id][data-node-id][data-port-type="input"]') as HTMLElement | null;
      targetNodeId = targetPort?.dataset.nodeId ?? null;
      targetPortId = targetPort?.dataset.portId ?? null;
    }

    if (targetNodeId && targetPortId && targetNodeId !== connectionDrag.current.nodeId) {
      addConnection(connectionDrag.current.nodeId, connectionDrag.current.portId, targetNodeId, targetPortId);
    }

    connectionDrag.current = null;
    hoveredInputPort.current = null;
    setTempConnection(null);
  }, [addConnection]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    handleMouseMove(e.clientX, e.clientY);
  }, [handleMouseMove]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggingNodeId(null);
    finishConnectionDrag(e.clientX, e.clientY);
  }, [finishConnectionDrag]);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => handleMouseMove(e.clientX, e.clientY);
    const handleWindowMouseUp = (e: MouseEvent) => {
      setIsPanning(false);
      setDraggingNodeId(null);
      finishConnectionDrag(e.clientX, e.clientY);
    };

    if (draggingNodeId || connectionDrag.current || isPanning) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingNodeId, finishConnectionDrag, handleMouseMove, isPanning, tempConnection]);

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
    if (activeTool === 'hand' || activeTool === 'connect') return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    dragStart.current = startMouse;
    nodeStartPos.current = { ...node.position };
  }, [nodes, activeTool]);

  const handlePortDragStart = useCallback((nodeId: string, portId: string, portType: Port['type']) => {
    if (activeTool === 'hand' || portType !== 'output') return;
    connectionDrag.current = { nodeId, portId };
    hoveredInputPort.current = null;
    const fromPos = getPortWorldPos(nodeId, portId);
    if (fromPos) {
      setTempConnection({ fromX: fromPos.x, fromY: fromPos.y, toX: fromPos.x, toY: fromPos.y });
    }
  }, [activeTool, getPortWorldPos]);

  const handlePortHover = useCallback((nodeId: string, portId: string, portType: Port['type']) => {
    if (!connectionDrag.current) return;
    if (portType !== 'input' || nodeId === connectionDrag.current.nodeId) {
      hoveredInputPort.current = null;
      return;
    }
    hoveredInputPort.current = { nodeId, portId };
  }, []);

  const handlePortHoverLeave = useCallback((nodeId: string, portId: string) => {
    if (hoveredInputPort.current?.nodeId === nodeId && hoveredInputPort.current?.portId === portId) {
      hoveredInputPort.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
          setSelectedConnectionId(null);
        } else if (selectedNodeId) {
          deleteNode(selectedNodeId);
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
        connectionDrag.current = null;
        hoveredInputPort.current = null;
        setTempConnection(null);
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, deleteNode, deleteConnection, undo, redo, setSelectedNodeId]);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <CanvasSidebar onAddNode={addNode} />

      <div
        ref={canvasRef}
        className="absolute inset-0 ml-14 canvas-grid"
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

          {nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              zoom={zoom}
              isSelected={selectedNodeId === node.id}
              onSelect={() => {
                setSelectedNodeId(node.id);
                setSelectedConnectionId(null);
              }}
              onUpdate={(updates) => updateNode(node.id, updates)}
              onDelete={() => deleteNode(node.id)}
              onDuplicate={() => duplicateNode(node.id)}
              onDragStart={handleNodeDragStart}
              onPortDragStart={handlePortDragStart}
              onPortHover={handlePortHover}
              onPortHoverLeave={handlePortHoverLeave}
            />
          ))}
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
