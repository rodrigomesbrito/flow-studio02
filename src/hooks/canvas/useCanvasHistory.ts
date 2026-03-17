import { useCallback, useRef } from 'react';
import { CanvasNode, Connection } from '@/types/canvas';

export interface CanvasSnapshot {
  nodes: CanvasNode[];
  connections: Connection[];
}

export type CanvasHistoryMode = 'push' | 'debounced' | 'none';

export interface CanvasHistoryOptions {
  history?: CanvasHistoryMode;
  debounceMs?: number;
}

const cloneCanvasSnapshot = (snapshot: CanvasSnapshot): CanvasSnapshot => ({
  nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
  connections: JSON.parse(JSON.stringify(snapshot.connections)),
});

const areSnapshotsEqual = (a: CanvasSnapshot, b: CanvasSnapshot): boolean => (
  JSON.stringify(a.nodes) === JSON.stringify(b.nodes)
  && JSON.stringify(a.connections) === JSON.stringify(b.connections)
);

export function useCanvasHistory() {
  const historyRef = useRef<CanvasSnapshot[]>([{ nodes: [], connections: [] }]);
  const historyIndexRef = useRef(0);
  const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionStartRef = useRef<CanvasSnapshot | null>(null);

  const clearPendingTimer = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  const pushSnapshot = useCallback((snapshot: CanvasSnapshot) => {
    clearPendingTimer();
    pendingSnapshotRef.current = null;

    const nextSnapshot = cloneCanvasSnapshot(snapshot);
    const currentSnapshot = historyRef.current[historyIndexRef.current];
    if (currentSnapshot && areSnapshotsEqual(currentSnapshot, nextSnapshot)) return;

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(nextSnapshot);
    if (nextHistory.length > 50) nextHistory.shift();

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, [clearPendingTimer]);

  const flushPending = useCallback(() => {
    if (!pendingSnapshotRef.current) {
      clearPendingTimer();
      return;
    }

    const snapshot = pendingSnapshotRef.current;
    pendingSnapshotRef.current = null;
    clearPendingTimer();
    pushSnapshot(snapshot);
  }, [clearPendingTimer, pushSnapshot]);

  const scheduleSnapshot = useCallback((snapshot: CanvasSnapshot, debounceMs = 250) => {
    pendingSnapshotRef.current = cloneCanvasSnapshot(snapshot);
    clearPendingTimer();
    pendingTimerRef.current = setTimeout(() => {
      flushPending();
    }, debounceMs);
  }, [clearPendingTimer, flushPending]);

  const beginAction = useCallback((snapshot: CanvasSnapshot) => {
    flushPending();
    actionStartRef.current = cloneCanvasSnapshot(snapshot);
  }, [flushPending]);

  const endAction = useCallback((snapshot: CanvasSnapshot) => {
    const startSnapshot = actionStartRef.current;
    actionStartRef.current = null;
    if (!startSnapshot || areSnapshotsEqual(startSnapshot, snapshot)) return;
    pushSnapshot(snapshot);
  }, [pushSnapshot]);

  const undo = useCallback(() => {
    flushPending();
    if (historyIndexRef.current <= 0) return null;
    historyIndexRef.current -= 1;
    return cloneCanvasSnapshot(historyRef.current[historyIndexRef.current]);
  }, [flushPending]);

  const redo = useCallback(() => {
    flushPending();
    if (historyIndexRef.current >= historyRef.current.length - 1) return null;
    historyIndexRef.current += 1;
    return cloneCanvasSnapshot(historyRef.current[historyIndexRef.current]);
  }, [flushPending]);

  const reset = useCallback((snapshot: CanvasSnapshot) => {
    clearPendingTimer();
    pendingSnapshotRef.current = null;
    actionStartRef.current = null;
    historyRef.current = [cloneCanvasSnapshot(snapshot)];
    historyIndexRef.current = 0;
  }, [clearPendingTimer]);

  return {
    beginAction,
    endAction,
    flushPending,
    pushSnapshot,
    redo,
    reset,
    scheduleSnapshot,
    undo,
  };
}
