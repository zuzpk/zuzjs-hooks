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

### Drag and Drop

- `useDrag`: Drag source hook with channel/payload probe API.
- `useDrop`: Drop target hook with accepts/canReceive/onHover/onReceive lifecycle.
- `useSortable`: Combined drag/drop hook for sortable item interactions.

### Time and Scheduling

- `useNextInterval`: Controlled interval scheduling.
- `useTimer`: Timer state and controls.

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

## Notes

- Hooks touching browser APIs must run in client-rendered environments.
- Use TypeScript in your app to get strongly-typed options and return values for each hook.

## License

MIT