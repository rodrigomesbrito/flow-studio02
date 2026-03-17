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
  const inFlightSave = useRef<Promise<void> | null>(null);
  const queuedPayload = useRef<{ nodes: CanvasNode[]; connections: Connection[] } | null>(null);

  // Load canvas data
  useEffect(() => {
    if (!canvasId || !user || loaded.current) return;

    const load = async () => {
      const { data } = await supabase
        .from('canvas_data')
        .select('nodes, connections')
        .eq('canvas_id', canvasId)
        .maybeSingle();

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
    queuedPayload.current = null;
    inFlightSave.current = null;
  }, [canvasId]);

  const persistLatest = useCallback(async () => {
    if (!canvasId || !user || !queuedPayload.current) return;
    if (inFlightSave.current) return inFlightSave.current;

    const run = async () => {
      while (queuedPayload.current) {
        const payload = queuedPayload.current;
        queuedPayload.current = null;

        const { error } = await supabase
          .from('canvas_data')
          .upsert(
            {
              canvas_id: canvasId,
              user_id: user.id,
              nodes: payload.nodes as any,
              connections: payload.connections as any,
            },
            { onConflict: 'canvas_id' }
          );

        if (error) {
          console.error('Failed to save canvas data', error);
          queuedPayload.current = payload;
          break;
        }
      }
    };

    inFlightSave.current = run().finally(() => {
      inFlightSave.current = null;
      if (queuedPayload.current) {
        void persistLatest();
      }
    });

    return inFlightSave.current;
  }, [canvasId, user]);

  const save = useCallback((nodes: CanvasNode[], connections: Connection[]) => {
    if (!canvasId || !user) return;
    queuedPayload.current = { nodes, connections };
    void persistLatest();
  }, [canvasId, user, persistLatest]);

  return { save };
}
