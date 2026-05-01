# @zuzjs/hooks

Utility hooks for browser APIs, UI behavior, persistence, media, DnD, data flow, and realtime communication.

## Installation

```bash
npm install @zuzjs/hooks
```

## Quick Start

```tsx
import { useDebounce, useLocalStorage, useNetworkStatus } from "@zuzjs/hooks";
```

## Hook Index

### UI and Interaction

- `useAnchor`: Anchor/trigger state for menus and overlays.
- `useAnchorPosition`: Compute screen-aware anchor positions.
- `useCarousel`: Carousel state, controls, and transitions.
- `useCodeLens`: Visual lens/inspection state for UI overlays.
- `useDebounce`: Debounced value/callback behavior.
- `useDelayed` (`useMounted` alias): Delay mount/visibility transitions.
- `useDimensions`: Measure element/window dimensions.
- `useDocumentTitle`: Read/update the document title.
- `useImage`: Image lifecycle loading state.
- `useImageCropper`: Crop interaction and output helpers.
- `useIntersectionObserver`: Viewport visibility detection.
- `useMorph`: Morph/motion transition helper state.
- `useMouseWheel`: Wheel event behavior helpers.
- `useMutationObserver`: Observe DOM subtree mutations.
- `useResizeObserver`: Observe element resize updates.
- `useScrollPhysics`: Scroll momentum/physics helpers.
- `useScrollbar`: Scroll position and breakpoint helpers.
- `useParallax`: Scroll-based parallax offset with ScrollView awareness.
- `useGradient`: Standard, orb, and animated gradient generation.

### Drag and Drop

- `useDrag`: Drag source hook with channel/payload probe API.
- `useDrop`: Drop target hook with accepts/canReceive/onHover/onReceive lifecycle.
- `useSortable`: Combined drag/drop hook for sortable item interactions.

### Time and Scheduling

- `useNextInterval`: Controlled interval scheduling.
- `useTimer`: Timer state and controls.
- `useTimeline`: Layered timeline progression for scroll/manual/auto scenes.

### Device and Platform

- `useDevice`: Device/platform capability detection.
- `useNetworkStatus`: Online/offline connectivity state.

### Storage and Persistence

- `useLocalStorage`: Typed localStorage state management.
- `useSessionStorage`: Typed sessionStorage state management.
- `useFileSystem`: Browser file system interactions.

### Commands and Shortcuts

- `useCommandActions`: Command registry and action handlers.
- `useShortcuts`: Keyboard shortcut handling.

### Data, DB, and Realtime

- `useDatabase` (`useDB` in provider context): IndexedDB utilities.
- `useDB`, `useDBHealed`, `useWatchDB`: DBProvider context hooks.
- `useWebSocket`: Typed websocket lifecycle and messaging.

### Media and Upload

- `useLineChart`: SVG/line chart calculation helpers.
- `useMediaPlayer`: Audio/video player state and controls.
- `useUploader`: Upload queue, progress, and lifecycle handling.

### Notifications and Analytics

- `usePushNotifications`: Push permission/token/subscription helpers.
- `useFacebookPixel`: Facebook pixel integration.
- `useGoogleTagManager`: GTM/gtag integration.

### Date and Calendar

- `useCalendar`: Calendar state and date-grid utilities.

## Drag and Drop Usage

`useDrag` and `useDrop` follow a `spec factory + deps` API and return `[collectedProps, connectorRef]`.

### useDrag

```tsx
import { useDrag } from "@zuzjs/hooks";

function Card({ id, title }: { id: string; title: string }) {
    const [{ isDragging }, dragRef] = useDrag(() => ({
        channel: "CARD",
        payload: { id, title },
        dragDelay: 0,
        observe: (probe) => ({
            isDragging: probe.active(),
        }),
    }), [id, title]);

    return <div ref={dragRef} style={{ opacity: isDragging ? 0.5 : 1 }}>{title}</div>;
}
```

**Key Features:**
- **Interactive Element Detection**: Drag is automatically skipped if `mousedown` occurs on interactive elements (buttons, inputs, links, etc.) or elements with role attributes (role="button", role="link"). This prevents accidental drags when clicking on nested interactive elements.
- **dragDelay**: Set `dragDelay` (in ms) to require the user to hold the mouse button before drag starts. Defaults to 0 (instant). If the user releases before the delay, no drag occurs.
- **Drag Payload**: The `payload` can be a static value or a function that computes the payload dynamically when drag starts.

### useSortable

```tsx
import { useSortable } from "@zuzjs/hooks";

function SortableRow({ index, item, move }: { index: number; item: { id: string; label: string }; move: (from: number, to: number) => void }) {
    const [{ isDragging, isOver }, rowRef] = useSortable(() => ({
        channel: "ROW",
        id: item.id,
        index,
        payload: item,
        dragDelay: 120,
        onMove: (dragged, toIndex) => {
            move(dragged.index, toIndex);
            dragged.index = toIndex;
        },
        observe: (state) => ({
            isDragging: state.isDragging,
            isOver: state.isOver,
        }),
    }), [index, item, move]);

    return <li ref={rowRef} style={{ opacity: isDragging ? 0.6 : 1, outline: isOver ? "1px dashed #999" : "none" }}>{item.label}</li>;
}
```

### Cross-List Drag and Drop

To enable dragging items across multiple lists, use the same `dragChannel` on both lists and share the same DnD context:

```tsx
import { useState } from "react";
import { useSortable } from "@zuzjs/hooks";

function MultiListDragDrop() {
    const [listA, setListA] = useState([
        { id: "a1", label: "Item A1" },
        { id: "a2", label: "Item A2" },
    ]);
    const [listB, setListB] = useState([
        { id: "b1", label: "Item B1" },
        { id: "b2", label: "Item B2" },
    ]);

    const moveWithinList = (list, setList, from, to) => {
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setList(next);
    };

    const moveAcrossLists = (fromList, setFromList, toList, setToList, fromIndex, toIndex) => {
        const fromCopy = [...fromList];
        const toCopy = [...toList];
        const [moved] = fromCopy.splice(fromIndex, 1);
        toCopy.splice(toIndex, 0, moved);
        setFromList(fromCopy);
        setToList(toCopy);
    };

    const SHARED_CHANNEL = "MULTI_LIST_ITEMS";

    return (
        <div style={{ display: "flex", gap: "20px" }}>
            {/* List A */}
            <ul>
                {listA.map((item, idx) => (
                    <li key={item.id} ref={(node) => {
                        // Use useSortable with shared channel
                        const [{ isDragging, isOver }, ref] = useSortable(() => ({
                            channel: SHARED_CHANNEL,
                            accepts: SHARED_CHANNEL,
                            id: item.id,
                            index: idx,
                            payload: item,
                            onMove: (dragged, toIndex) => {
                                if (dragged.index < toIndex) {
                                    moveWithinList(listA, setListA, dragged.index, toIndex);
                                }
                            },
                            onDrop: (dragged, toIndex) => {
                                moveWithinList(listA, setListA, dragged.index, toIndex);
                                dragged.index = toIndex;
                            },
                        }), [idx, item]);
                        ref(node);
                    }}>
                        {item.label}
                    </li>
                ))}
            </ul>

            {/* List B */}
            <ul>
                {listB.map((item, idx) => (
                    <li key={item.id} ref={(node) => {
                        const [{ isDragging, isOver }, ref] = useSortable(() => ({
                            channel: SHARED_CHANNEL,
                            accepts: SHARED_CHANNEL,
                            id: item.id,
                            index: idx,
                            payload: item,
                            onMove: (dragged, toIndex) => {
                                if (dragged.index < toIndex) {
                                    moveWithinList(listB, setListB, dragged.index, toIndex);
                                }
                            },
                            onDrop: (dragged, toIndex) => {
                                moveWithinList(listB, setListB, dragged.index, toIndex);
                                dragged.index = toIndex;
                            },
                        }), [idx, item]);
                        ref(node);
                    }}>
                        {item.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

**Key points for cross-list dragging:**
- Both lists must use the **same `channel`** and accept the same channel
- Each list maintains its own state (reordering updates its state)
- When dropping, detect which list the item came from and which it's being dropped into
- Use the `onDrop` callback to finalize the move across lists

### useDrop

```tsx
import { useDrop } from "@zuzjs/hooks";

function Column({ onDropCard }: { onDropCard: (item: any) => void }) {
    const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
        accepts: "CARD",
        canReceive: (item) => Boolean(item?.id),
        onHover: (item) => {
            // Optional hover lifecycle
        },
        onReceive: (item) => {
            if (item) onDropCard(item);
        },
        observe: (probe) => ({
            isOver: probe.hovering(),
            canDrop: probe.canReceive(),
        }),
    }), [onDropCard]);

    return (
        <div
            ref={dropRef}
            style={{
                minHeight: 120,
                border: "1px dashed #999",
                background: isOver ? (canDrop ? "#e8ffe8" : "#ffe8e8") : "transparent",
            }}
        >
            Drop Here
        </div>
    );
}
```

## Persistence Usage

### useLocalStorage

```tsx
import { useLocalStorage } from "@zuzjs/hooks";

function ThemeToggle() {
    const [theme, setTheme] = useLocalStorage("theme", "light");

    return (
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme}
        </button>
    );
}
```

### useSessionStorage

```tsx
import { useSessionStorage } from "@zuzjs/hooks";

function SearchDraft() {
    const [query, setQuery] = useSessionStorage("search-query", "");
    return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

## Realtime Usage

### useWebSocket

```tsx
import { useWebSocket } from "@zuzjs/hooks";

function ChatClient() {
    const { connect, send, connected } = useWebSocket({
        url: "wss://example.com/socket",
    });

    useEffect(() => {
        connect();
    }, [connect]);

    return (
        <button disabled={!connected} onClick={() => send({ type: "ping" })}>
            Send
        </button>
    );
}
```

## Visual Animation Usage

### useGradient

```tsx
import { useEffect } from "react";
import { useGradient } from "@zuzjs/hooks";

function AiHero({ thinking }: { thinking: boolean }) {
    const { style, controls } = useGradient({

        type: "orb",
        animate: true,
        animation: "rotate",
        autoPlay: true,
        duration: 9000,
        preset: "idle",
        bloom: true,
        bloomIntensity: 0.55,
        bloomAnimate: true,
        orbs: [
            { color: "#7C3AED", x: 20, y: 24, size: 48, opacity: 0.58 },
            { color: "#00D4FF", x: 78, y: 34, size: 42, opacity: 0.5 },
            { color: "#2D5BFF", x: 52, y: 76, size: 52, opacity: 0.45 },
        ],
    });

    useEffect(() => {
        // Idle ambient motion -> fast activity while submit/thinking is active.
        controls.setPreset(thinking ? "thinking" : "idle");

        // Optional flash burst when entering the thinking state.
        if (thinking) controls.flash(1.2, 260);
    }, [thinking, controls]);

    return <div style={{ ...style, minHeight: 260, borderRadius: 14 }} />;
}
```

#### Direct DOM mode (`directDOM`)

By default every animation frame calls `setProgress()` which triggers a React re-render. When attached to a decorative element you can bypass React state entirely:

```tsx
function GlowOrb({ thinking }: { thinking: boolean }) {
    const { style, elementRef, controls } = useGradient({
        type: "orb",
        animate: true,
        animation: "float",
        autoPlay: true,
        duration: 6000,
        preset: "idle",
        directDOM: true,  // animated CSS written directly to elementRef — zero React renders
        bloom: true,
        bloomIntensity: 0.55,
        bloomAnimate: true,
        orbs: [
            { color: "#7C3AED", x: 20, y: 24, size: 48, opacity: 0.58 },
            { color: "#00D4FF", x: 78, y: 34, size: 42, opacity: 0.5 },
        ],
    });

    useEffect(() => {
        controls.setPreset(thinking ? "thinking" : "idle");
        if (thinking) controls.flash(1.2, 260);
    }, [thinking, controls]);

    // Attach elementRef to the target element — style only contains static props
    return <div ref={elementRef as React.Ref<HTMLDivElement>} style={{ ...style, borderRadius: "50%" }} />;
}
```

**When to use `directDOM`:** decorative animated backgrounds, glow orbs, or any element where the animation should not trigger parent re-renders.
**When not to use it:** when you need the `progress` value in React state (e.g. to drive other components).

For GPU-heavy scenes, cap animation updates with `maxFPS` (default `30`):

```tsx
useGradient({
    type: "radial",
    animate: true,
    directDOM: true,
    cssAnimation: true, // compositor-driven path when supported
    webgl: true,        // integrated WebGL mode in the same hook (no external libs)
    webglDprCap: 1.25,  // reduce GPU load on high-DPR screens
    maxFPS: 24,
});
```
```

### useTimeline

#### Single range per layer

Each layer animates over one `start` → `end` scroll range. Flat keys on the layer object are the quickest API:

```tsx
import { useTimeline } from "@zuzjs/hooks";

function ScrollScene() {
    const { containerRef, layers, effects, layerStates, getLayerScrollRange } = useTimeline({
        mode: "scroll",
        sceneHeight: 2200,
        layers: [
            {
                id: "intro",
                start: 0,
                end: 0.25,
                opacity: { from: 0, to: 1 },
                y: ["32px", 0, "easeOut"],
                scale: { from: 0.96, to: 1 },
            },
            {
                id: "expand",
                start: 0.25,
                end: 0.8,
                opacity: { from: 0.7, to: 1 },
                borderRadius: ["24px", 0],
                perspective: ["400px", "900px"],
                rx: ["12deg", 0],
                ry: ["-8deg", 0],
                z: ["-80px", 0],
                scale3d: {
                    x: { from: 0.92, to: 1 },
                    y: { from: 0.92, to: 1 },
                    z: { from: 1, to: 1 },
                },
            },
            {
                id: "content",
                start: 1,
                end: 0.8,
                opacity: { from: 1, to: 0 },
            },
        ],
    });

    const introRange = getLayerScrollRange("intro");
    // introRange?.span = total scroll px consumed by the intro range

    return (
        <div ref={containerRef} style={{ height: "250vh" }}>
            <div style={{ position: "sticky", top: 0, ...effects.intro }}>
                Timeline-driven hero
            </div>
            <div style={{ ...effects.expand, opacity: 1 - layers.content }}>
                3D transform scene
            </div>
            <small>
                expand active: {String(layerStates.expand.active)}
                {" | intro px span: "}{introRange?.span ?? 0}
            </small>
        </div>
    );
}
```

#### Multiple ranges per layer (`keyframes`)

Use `keyframes` on a layer to chain several `start`/`end` ranges under the same ID. Each keyframe supports the same flat-key API as a single-range layer. Effects from each keyframe are applied in order — once a keyframe completes it holds its end state until the next one begins, giving seamless chaining.

```tsx
const { containerRef, effects } = useTimeline({
    mode: "scroll",
    sceneHeight: 3000,
    layers: [
        {
            id: "hero",
            keyframes: [
                // Phase 1: enters from below while fading in
                { start: 0,   end: 0.3, opacity: [0, 1],    y: ["60px", 0, "easeOut"] },
                // Phase 2: scales down while drifting up
                { start: 0.3, end: 0.7, scale: [1, 0.85],   y: ["0px", "-40px"] },
                // Phase 3: collapses and fades out
                { start: 0.7, end: 1.0, scale: [0.85, 0.1], opacity: [1, 0] },
            ],
        },
    ],
});

return (
    <div ref={containerRef} style={{ height: "300vh" }}>
        <div style={{ position: "sticky", top: 0, ...effects.hero }}>
            Hero
        </div>
    </div>
);
```

`layers.hero` gives the overall 0→1 progress across the full `keyframes` timeline.
`effects.hero` gives the merged CSS style for the currently active keyframe(s).

#### Anchor references (`start`/`end` linked to other layers)

You can link `start`/`end` to another layer (or keyframe) instead of hardcoding numbers.

Supported forms:

- `"hero"` → defaults to `hero:end`
- `"hero:start"` / `"hero:end"`
- `"hero#intro:end"` (target keyframe by keyframe `id`)
- `"hero@0:start"` (target keyframe by index)
- `"hero:end+0.03"` / `"hero:end-0.02"` (offset in progress space)
- `{ layerId: "hero", edge: "end", offset: 0.03 }`

```tsx
useTimeline({
    mode: "scroll",
    interpolate: true,
    layers: [
        {
            id: "heroGradient",
            keyframes: [
                { id: "shrink", start: 1, end: 0.5, scale: [1, 0.3] },
            ],
        },
        {
            id: "dashboard",
            keyframes: [
                // Starts slightly after heroGradient ends, then eases in
                { start: "heroGradient:end+0.03", end: 0.78, y: [0, 200, "easeOut"] },
            ],
        },
    ],
});
```

Tip: if `start` and `end` resolve to the same point, the animation can look like a snap. Use an offset (`+0.02` to `+0.08`) or a larger range.

#### Built-in debug overlay

You no longer need to render a debug panel in each page. Enable `debug: true` and `useTimeline` mounts a floating overlay on `document.body` automatically.

```tsx
useTimeline({
    mode: "scroll",
    debug: process.env.NODE_ENV !== "production",
    // debugOverlay defaults to true
    // debugOverlay: false, // optional: disable built-in overlay
    layers: [...],
});
```

The overlay shows:

- live `sceneHeight`, `viewportHeight`, `scrollTop`, `scrollProgress`
- per-layer pixel ranges
- px <-> progress conversions
- **recommended offset hints** when a linked span is near-zero and likely to snap/flicker

#### Apple-style reveal + stack example

This pattern reveals multiple objects in phases, then stacks/compresses them like a product scroll narrative.

```tsx
const { containerRef, effects } = useTimeline({
    mode: "scroll",
    interpolate: true,
    lerpFactor: 0.08,
    layers: [
        {
            id: "phone",
            keyframes: [
                { id: "enter", start: 0.02, end: 0.2, opacity: [0, 1], y: [80, 0, "easeOut"], scale: [0.86, 1, "easeOut"] },
                { id: "float", start: "phone#enter:end", end: 0.48, y: [0, -18], ry: [0, -6], rx: [0, 4] },
                { id: "stack", start: "cards#enter:end+0.02", end: 0.85, y: [-18, -56], scale: [1, 0.88], opacity: [1, 0.95] },
            ],
        },
        {
            id: "cards",
            keyframes: [
                { id: "enter", start: "phone#enter:end+0.02", end: 0.58, opacity: [0, 1], y: [120, 0, "easeOut"], sx: [0.9, 1], sy: [0.9, 1] },
                { id: "stack", start: "phone#stack:start", end: 0.9, y: [0, 48], scale: [1, 0.84], opacity: [1, 0.82] },
            ],
        },
        {
            id: "headline",
            keyframes: [
                { start: 0, end: 0.16, opacity: [0, 1], y: [24, 0] },
                { start: "phone#stack:start", end: 0.92, opacity: [1, 0.1], y: [0, -40] },
            ],
        },
    ],
});

return (
    <section ref={containerRef} style={{ height: "340vh", position: "relative" }}>
        <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
            <h1 style={{ ...effects.headline }}>Powerful. Layered. Cinematic.</h1>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", ...effects.phone }}>
                {/* phone mock */}
            </div>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", ...effects.cards }}>
                {/* card stack */}
            </div>
        </div>
    </section>
);
```

#### Smooth scroll mode (`interpolate`)

By default the playhead snaps directly to the scroll position on every frame. Set `interpolate: true` to lerp the playhead toward the scroll target — producing a smooth, inertia-like response:

```tsx
useTimeline({
    mode: "scroll",
    interpolate: true,
    lerpFactor: 0.08, // 0.01 (very slow) → 0.5 (near-instant). Default: 0.1
    maxFPS: 45,       // cap playhead state updates during scroll/lerp
    layers: [
        {
            id: "hero",
            entry: {
                duration: 800,
                delay: 80,
                opacity: [0, 1],
                y: [36, 0, "easeOut"],
                scale: [0.96, 1, "easeOut"],
            },
            keyframes: [
                { start: 0.08, end: 0.42, y: [0, -42] },
            ],
        },
    ],
})
```

`entry` runs once per layer on mount and uses the same flat effect API as keyframes.

#### Triggers

Every layer span, keyframe, and entry supports a `trigger` option that controls *when and how* the animation plays.

##### Span / Keyframe trigger

| Value | Behaviour |
|---|---|
| `"timeline"` (default) | Sticky chaining — once a span starts it holds its end-state until the next span takes over. Classic scroll timeline. |
| `"inView"` | Active **only while** the playhead is inside this span's range. Reverses when you scroll back. |

```tsx
// Layer default — all keyframes on this layer reverse on scroll-back
{
    id: "card",
    trigger: "inView",
    keyframes: [
        { start: 0.1, end: 0.3, y: [60, 0], opacity: [0, 1] },
        { start: 0.3, end: 0.6, scale: [1, 1.08] },
    ],
}

// Per-keyframe override — only this span reverses
{
    id: "badge",
    keyframes: [
        { trigger: "inView", start: 0.2, end: 0.4, y: [40, 0] },
        { start: 0.4, end: 0.7, opacity: [1, 0] }, // sticky
    ],
}
```

##### Entry trigger

| Value | Behaviour |
|---|---|
| `"mount"` (default) | Runs **once** after the component mounts, then stops. |
| `"inView"` | Progress is tied to the layer's scroll range — plays forward and **reverses** when you scroll back out. |

```tsx
// One-time mount animation (default)
{
    id: "hero",
    entry: {
        duration: 700,
        y: [80, 0, "$easing-spring"], // $token → var(--easing-spring)
        opacity: [0, 1],
    },
}

// Reversible in-view entry — animates in/out as you scroll
{
    id: "feature",
    start: 0.15,
    end: 0.45,
    entry: {
        trigger: "inView",
        y: [60, 0, "easeOut"],      // inline tuple easing per property
        opacity: [0, 1],
        scale: [0.94, 1],
    },
}
```

#### Value API

`useTimeline` supports both forward ranges (`start: 0 → end: 0.5`) and reverse ranges (`start: 1 → end: 0.5`).
Use `effects[layerId]` for auto-composed style output and `layers[layerId]` when you need direct 0→1 progress.

Flat keys on a layer (or keyframe) accept `TransformValueEffect`:

- **Object mode:** `{ from: "24px", to: 0, easing: "easeOut" }`
- **Tuple mode:** `["24px", 0, "easeOut"]`

Units are inferred from `from`/`to` — no separate `unit` field needed.

Easing presets: `"linear"` | `"easeIn"` | `"easeOut"` | `"easeInOut"` or a custom `(t: number) => number`.

If easing is omitted, `useTimeline` defaults to `"easeOut"`.

**Transform shorthand aliases** (work as flat keys or inside `transforms`):

| Shorthand | CSS function |
|---|---|
| `x`, `y`, `z` | `translateX`, `translateY`, `translateZ` |
| `rx`, `ry`, `rz` | `rotateX`, `rotateY`, `rotateZ` |
| `sx`, `sy`, `sz` | `scaleX`, `scaleY`, `scaleZ` |
| `skx`, `sky` | `skewX`, `skewY` |
| `skew` | `skew(angle)` or `{ x, y }` pair |

### useParallax

### useParallax

```tsx
import { useParallax } from "@zuzjs/hooks";
import { useRef } from "react";

function GlowLayer() {
    const anchorRef = useRef<HTMLDivElement>(null);
    const offset = useParallax(0.18, anchorRef);

    return (
        <div ref={anchorRef} style={{ transform: `translateY(${offset}px)` }}>
            Floating glow layer
        </div>
    );
}
```

`useParallax` and `useTimeline` automatically use `ScrollView`'s internal scroll container when mounted inside `ScrollView`, otherwise they use native window scroll.

Scroll updates are batched \u2014 only one `requestAnimationFrame` is ever in flight at a time. Micro-changes below 0.5 px are skipped to avoid unnecessary re-renders.

## Data and DB Usage

### useDatabase

```tsx
import { useDatabase } from "@zuzjs/hooks";

function TodoStore() {
    const db = useDatabase({
        dbName: "todos-db",
        storeName: "todos",
        version: 1,
        keyPath: "id",
    });

    // db.add / db.get / db.update / db.remove pattern depends on your schema setup.
    return null;
}
```

### DBProvider Hooks

```tsx
import { DatabaseProvider, useDB, useWatchDB } from "@zuzjs/hooks";

function Todos() {
    const db = useDB();
    useWatchDB("todos", () => {
        // react to db mutations
    });
    return null;
}
```

## Additional Exports

The package also exports related types and helpers, including:

- Calendar and crop types: `CalendarMonthFormat`, `CalendarWeekdayFormat`, `CropShape`.
- Keyboard and anchor enums: `KeyCode`, `AnchorType`.
- Command and chart types: `Command`, `CommandActionProps`, `LineChartProps`, `DataPoint`.
- DnD types: `DragSpec`, `DragProbe`, `DropSpec`, `DropProbe`.
- DB provider utilities: `DatabaseProvider`, `DB_HEAL_BLOCKED_KEY`, `DB_HEAL_STATE_KEY`, `DB_HEALED_KEY`.
- Timeline types: `TimelineLayer`, `TimelineKeyframe`, `TimelineLayerState`, `TimelineEffect`, `TimelineEasing`, `TimelineMode`, `TimelineOptions`, `TimelineTransformEffects`, `TransformValueEffect`, `TransformValueTuple`.
- Gradient types: `UseGradientOptions`, `UseGradientResult`, `GradientType`, `GradientAnimation`, `GradientMotionPreset`, `GradientStop`, `OrbLayer`.

## Notes

- Hooks touching browser APIs must run in client-rendered environments.
- Use TypeScript in your app to get strongly-typed options and return values for each hook.

## License

MIT