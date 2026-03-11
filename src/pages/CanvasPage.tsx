import { useParams } from 'react-router-dom';
import { InfiniteCanvas } from '@/components/canvas/InfiniteCanvas';

export default function CanvasPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  return <InfiniteCanvas />;
}
