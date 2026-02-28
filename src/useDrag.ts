"use client"
import { useEffect, useRef, useState } from 'react';

interface Position {
    x: number;
    y: number;
}

export enum DragDirection {
    x = "x",
    y = "y",
    xy = "xy"
}

export type DragOptions = {
    direction?: DragDirection,
    snap?: number,
    limits?: { left?: number, right?: number, top?: number, bottom?: number },
}

const useDrag = (dragOptions? : DragOptions) => {

    const { direction, snap, limits } = dragOptions || { 
        direction: DragDirection.xy, 
        snap: 0, 
        limits: {} 
    } as DragOptions;

    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef<Position>({ x: 0, y: 0 });
    const wasDragged = useRef(false);

    const onMouseDown = (event: React.MouseEvent) => {
        isDragging.current = true;
        wasDragged.current = false;  // Reset drag flag on mouse down
        dragStart.current = {
            x: event.clientX - position.x,
            y: event.clientY - position.y
        };

        // Prevent text selection during dragging
        event.preventDefault();
    };

    const onMouseMove = (event: MouseEvent) => {
        if (!isDragging.current) return;

        let newX = position.x //event.clientX - dragStart.current.x;
        let newY = position.y //event.clientY - dragStart.current.y;

        if (direction === DragDirection.x || direction === DragDirection.xy) {
            newX = event.clientX - dragStart.current.x;
        }

        if (direction === DragDirection.y || direction === DragDirection.xy) {
            newY = event.clientY - dragStart.current.y;
        }

        // Apply limits
        if (limits!.left !== undefined) newX = Math.max(newX, limits!.left);
        if (limits!.right !== undefined) newX = Math.min(newX, limits!.right);
        if (limits!.top !== undefined) newY = Math.max(newY, limits!.top);
        if (limits!.bottom !== undefined) newY = Math.min(newY, limits!.bottom);

        // Apply snapping
        if (snap && snap > 0) {
            newX = Math.round(newX / snap) * snap;
            newY = Math.round(newY / snap) * snap;
        }

        // Set `wasDragged` to true if the mouse has moved from the starting position
        if (Math.abs(newX - position.x) > 1 || Math.abs(newY - position.y) > 1) {
            wasDragged.current = true;
        }

        setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };

    useEffect(() => {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [limits]);

    return {
        position,
        onMouseDown,
        isDragging: wasDragged.current
    };
};

export default useDrag