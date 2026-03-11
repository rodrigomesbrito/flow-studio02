

## Fix Connection System

### Issues Found
1. **Default connection color is green** (`hsl(160 84% 39%)`) — should be purple (`#a855f7`) to match the reference
2. **Temp connection line uses green** — should also be purple
3. **SVG layer offset (-10000)** means coordinates in the SVG don't align with node positions in the transform container. The SVG is a child of the transform div, so its coordinate space is already in canvas-world coordinates. The offset hack breaks coordinate alignment — paths render at wrong positions.

### Root Cause of Lines Not Appearing
The SVG has `top: -10000, left: -10000` which shifts it 10000px in canvas-world space. But `getHandleWorldPosition` returns node positions in canvas-world coordinates (e.g., x=400, y=300). The path is drawn at (400, 300) inside the SVG, but the SVG's origin is at (-10000, -10000), so the path actually appears at (-9600, -9700) relative to the transform div — completely off-screen from where the nodes are.

**Fix**: Remove the offset hack. Since the SVG is inside the transform div (same coordinate space as nodes), use `position: absolute; top: 0; left: 0; width: 1px; height: 1px; overflow: visible` — the paths will render at correct world coordinates via overflow.

### Changes

**`src/components/canvas/connection-utils.ts`**
- Change `DEFAULT_EDGE_COLOR` to `#a855f7` (purple)

**`src/hooks/useCanvasState.ts`**
- Change `DEFAULT_CONNECTION_COLOR` to `#a855f7`

**`src/components/canvas/ConnectionLines.tsx`**
- Fix SVG positioning: `top: 0, left: 0, width: 1, height: 1, overflow: visible` (no offset)
- Set temp connection color to purple explicitly

**`src/components/canvas/NodeCard.tsx`**
- Ensure port handle `transform` on hover doesn't conflict with the `translateY(-50%)` positioning (the CSS `.port-handle:hover` overrides transform, losing the centering). Fix by using a wrapper or adjusting the CSS.

**`src/index.css`**
- Fix `.port-handle:hover` transform to preserve `translateY(-50%)`: change `transform: scale(1.18)` to `transform: translateY(-50%) scale(1.18)` for left/right ports (or just remove the transform override and use `width`/`height` change instead)

