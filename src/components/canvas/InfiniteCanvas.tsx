import { useRef, useState, useCallback, useEffect } from 'react';
import { useCanvasState } from '@/hooks/useCanvasState';
import { CanvasSidebar } from './CanvasSidebar';
import { BottomToolbar } from './BottomToolbar';
import { NodeCard } from './NodeCard';
import { ConnectionLines } from './ConnectionLines';
import { Position } from '@/types/canvas';

export function InfiniteCanvas() {
  const {
    nodes, connections, offset, zoom, selectedNodeId,
    setOffset, setZoom, setSelectedNodeId,
    addNode, updateNode, deleteNode, duplicateNode,
    addConnection, undo, redo, zoomIn, zoomOut, resetView,
  } = useCanvasState();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<Position>({ x: 0, y: 0 });
  const offsetStart = useRef<Position>({ x: 0, y: 0 });

  // Dragging nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const nodeStartPos = useRef<Position>({ x: 0, y: 0 });

  // Connection dragging
  const [tempConnection, setTempConnection] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);
  const connectionDrag = useRef<{ nodeId: string; portId: string; startX: number; startY: number } | null>(null);

  // Pan handling
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === canvasRef.current?.firstChild)) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
      setSelectedNodeId(null);
    }
  }, [offset, setSelectedNodeId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: offsetStart.current.x + (e.clientX - panStart.current.x),
        y: offsetStart.current.y + (e.clientY - panStart.current.y),
      });
    }

    if (draggingNodeId) {
      const node = nodes.find(n => n.id === draggingNodeId);
      if (node) {
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;
        updateNode(draggingNodeId, {
          position: { x: nodeStartPos.current.x + dx, y: nodeStartPos.current.y + dy }
        });
      }
    }

    if (connectionDrag.current) {
      const fromNode = nodes.find(n => n.id === connectionDrag.current!.nodeId);
      if (fromNode) {
        const port = fromNode.ports.find(p => p.id === connectionDrag.current!.portId);
        if (port) {
          let fromX = fromNode.position.x, fromY = fromNode.position.y;
          if (port.side === 'right') { fromX += fromNode.size.width; fromY += fromNode.size.height / 2; }
          else if (port.side === 'left') { fromY += fromNode.size.height / 2; }

          const rect = canvasRef.current!.getBoundingClientRect();
          const toX = (e.clientX - rect.left - offset.x) / zoom;
          const toY = (e.clientY - rect.top - offset.y) / zoom;
          setTempConnection({ fromX, fromY, toX, toY });
        }
      }
    }
  }, [isPanning, draggingNodeId, nodes, zoom, offset, updateNode, setOffset]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
    if (connectionDrag.current) {
      connectionDrag.current = null;
      setTempConnection(null);
    }
  }, []);

  // Zoom with wheel
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

  // Node drag
  const handleNodeDragStart = useCallback((nodeId: string, startMouse: Position) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    dragStart.current = startMouse;
    nodeStartPos.current = { ...node.position };
  }, [nodes]);

  // Port connection
  const handlePortDragStart = useCallback((nodeId: string, portId: string, pos: Position) => {
    connectionDrag.current = { nodeId, portId, startX: pos.x, startY: pos.y };
  }, []);

  const handlePortDragEnd = useCallback((nodeId: string, portId: string) => {
    if (connectionDrag.current && connectionDrag.current.nodeId !== nodeId) {
      addConnection(connectionDrag.current.nodeId, connectionDrag.current.portId, nodeId, portId);
    }
    connectionDrag.current = null;
    setTempConnection(null);
  }, [addConnection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeId) {
        deleteNode(selectedNodeId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode, undo, redo]);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <CanvasSidebar onAddNode={addNode} />

      <div
        ref={canvasRef}
        className="absolute inset-0 ml-14 canvas-grid"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <ConnectionLines connections={connections} nodes={nodes} tempConnection={tempConnection} />

          {nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              zoom={zoom}
              isSelected={selectedNodeId === node.id}
              onSelect={() => setSelectedNodeId(node.id)}
              onUpdate={(updates) => updateNode(node.id, updates)}
              onDelete={() => deleteNode(node.id)}
              onDuplicate={() => duplicateNode(node.id)}
              onDragStart={handleNodeDragStart}
              onPortDragStart={handlePortDragStart}
              onPortDragEnd={handlePortDragEnd}
            />
          ))}
        </div>
      </div>

      <BottomToolbar
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
  );
}
