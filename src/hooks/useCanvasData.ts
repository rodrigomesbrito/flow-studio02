import { useEffect, useRef, useCallback } from 'react';
import { CanvasNode, Connection } from '@/types/canvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCanvasData(
  canvasId: string | undefined,
  loadData: (nodes: CanvasNode[], connections: Connection[]) => void,
) {
  const { user } = useAuth();
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load canvas data
  useEffect(() => {
    if (!canvasId || !user || loaded.current) return;

    const load = async () => {
      const { data } = await supabase
        .from('canvas_data')
        .select('nodes, connections')
        .eq('canvas_id', canvasId)
        .single();

      if (data) {
        loadData(
          (data.nodes as unknown as CanvasNode[]) || [],
          (data.connections as unknown as Connection[]) || [],
        );
      }
      loaded.current = true;
    };

    load();
  }, [canvasId, user, loadData]);

  // Reset loaded flag when canvasId changes
  useEffect(() => {
    loaded.current = false;
  }, [canvasId]);

  // Save with debounce
  const save = useCallback((nodes: CanvasNode[], connections: Connection[]) => {
    if (!canvasId || !user) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase
        .from('canvas_data')
        .upsert(
          { canvas_id: canvasId, user_id: user.id, nodes: nodes as any, connections: connections as any },
          { onConflict: 'canvas_id' }
        );
    }, 500);
  }, [canvasId, user]);

  return { save };
}
