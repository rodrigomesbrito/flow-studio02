import { useParams } from 'react-router-dom';
import { InfiniteCanvas } from '@/components/canvas/InfiniteCanvas';
import { useCanvasData } from '@/hooks/useCanvasData';
import { useCanvasState } from '@/hooks/useCanvasState';

export default function CanvasPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  
  return <InfiniteCanvas canvasId={canvasId} />;
}
