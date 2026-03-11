

## Fix Connection Lines Between Canvas Cards

### Root Cause Analysis

Two critical bugs prevent connections from working:

**Bug 1: SVG has zero dimensions.** The `ConnectionLines` SVG is inside the transform div which has no explicit size (NodeCards are `position: absolute` so they don't contribute to parent size). The SVG uses `width: 100%` / `height: 100%` which resolves to 0x0. Even with `overflow: visible`, paths won't render properly.

**Bug 2: Window-level mouse listeners not registered during connection drag.** The `useEffect` (line 173) checks `connectionDragRef.current` to decide whether to add window listeners, but since it's a ref (not state), changing it doesn't trigger a re-render, so the effect never activates for connection drags. If the mouse moves slightly outside the canvas during drag, events are lost and the connection is never created.

### Fix Plan

**File: `src/components/canvas/InfiniteCanvas.tsx`**

1. Add a `isConnecting` state boolean that gets set alongside `connectionDragRef.current` — this triggers re-renders so the window listener effect fires
2. Include `isConnecting` in the `useEffect` dependency that registers window-level `mousemove`/`mouseup` listeners
3. Update `handlePortDragStart`, `resetConnectionDrag`, and `finishConnectionDrag` to toggle `isConnecting`

**File: `src/components/canvas/ConnectionLines.tsx`**

4. Replace percentage-based SVG dimensions with a large fixed viewport that covers any canvas area. Use `width` and `height` of a very large value (e.g., 20000x20000) offset by -10000 to cover negative coordinates, ensuring paths always render regardless of parent size

These two fixes address both the rendering and interaction bugs, making connections work reliably.

