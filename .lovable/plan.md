

## Two Layout Fixes

### 1. Remove Scrollbars
The outer container already has `overflow-hidden` on both the root div and the canvas div (lines 264, 268). I'll check if something else is causing overflow — likely the `ConnectionLines` SVG with its 20000x20000 size and negative offsets is overflowing. I'll also add `overflow: hidden` to the `html` and `body` via the canvas page or index.css to be safe.

Actually, looking at InfiniteCanvas, both containers already have `overflow-hidden`. The issue may be at a higher level (the `ml-14` wrapper in App.tsx or the page itself). I'll add `overflow-hidden` to the canvas route wrapper in `App.tsx` (the `<div className="ml-14">` wrapper).

### 2. Restore Logo in Sidebar
Add a logo element at the top of `AppSidebar.tsx`, above the back button — a small branded square with "W" like the workspace sidebar has, maintaining the dark minimal style.

### Changes

**`src/components/AppSidebar.tsx`**: Add logo block at top (before back button) — a `w-8 h-8 mt-3 mb-1 rounded-lg bg-primary/20` div with "W" text.

**`src/App.tsx`**: Add `overflow-hidden` to the canvas route's outer wrapper div.

