import { addPropsToChildren } from "@zuzjs/core/react";
import { ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import useDelayed from "./useDelayed";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type AnchorPlacement = "top" | "bottom" | "left" | "right";

type UseAnchorOptions = {
    autoFlip?: boolean;
    open?: boolean;
    preferredPlacement?: AnchorPlacement;
    margin?: number;
    offset?: number;
};

const placementOrderMap: Record<AnchorPlacement, AnchorPlacement[]> = {
    bottom: ["bottom", "top", "right", "left"],
    top: ["top", "bottom", "right", "left"],
    right: ["right", "left", "bottom", "top"],
    left: ["left", "right", "bottom", "top"],
};

type Rect = {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
};

const getProjectedRect = (
    placement: AnchorPlacement,
    anchorRect: DOMRect,
    floatingRect: DOMRect,
    gap: number
): Rect => {
    const width = floatingRect.width;
    const height = floatingRect.height;

    switch (placement) {
        case "top": {
            const left = anchorRect.left;
            const top = anchorRect.top - gap - height;
            return {
                top,
                left,
                right: left + width,
                bottom: top + height,
                width,
                height,
            };
        }
        case "left": {
            const left = anchorRect.left - gap - width;
            const top = anchorRect.top;
            return {
                top,
                left,
                right: left + width,
                bottom: top + height,
                width,
                height,
            };
        }
        case "right": {
            const left = anchorRect.right + gap;
            const top = anchorRect.top;
            return {
                top,
                left,
                right: left + width,
                bottom: top + height,
                width,
                height,
            };
        }
        case "bottom":
        default: {
            const left = anchorRect.left;
            const top = anchorRect.bottom + gap;
            return {
                top,
                left,
                right: left + width,
                bottom: top + height,
                width,
                height,
            };
        }
    }
};

const getOverflowScore = (rect: Rect) => {
    const overflowTop = Math.max(0, -rect.top);
    const overflowLeft = Math.max(0, -rect.left);
    const overflowRight = Math.max(0, rect.right - window.innerWidth);
    const overflowBottom = Math.max(0, rect.bottom - window.innerHeight);

    return overflowTop + overflowLeft + overflowRight + overflowBottom;
};

const getPlacementStyle = (placement: AnchorPlacement, offset: number): Partial<Record<string, string>> => {
    switch (placement) {
        case "top":
            return {
                positionAnchor: "",
                left: "anchor(left)",
                right: "auto",
                top: "auto",
                bottom: `calc(anchor(top) + ${offset}px)`,
            };
        case "left":
            return {
                positionAnchor: "",
                right: `calc(anchor(left) + ${offset}px)`,
                top: "anchor(top)",
                left: "auto",
                bottom: "auto",
            };
        case "right":
            return {
                positionAnchor: "",
                left: `calc(anchor(right) + ${offset}px)`,
                top: "anchor(top)",
                right: "auto",
                bottom: "auto",
            };
        case "bottom":
        default:
            return {
                positionAnchor: "",
                top: `calc(anchor(bottom) + ${offset}px)`,
                left: "anchor(left)",
                right: "auto",
                bottom: "auto",
            };
    }
};

const useAnchor = (
    children: ReactNode, 
    anchorName: string = `--anchor`, 
    options?: UseAnchorOptions
) => {

    const [ hovered, setHovered ] = useState(false)
    const mounted = useDelayed()
    const anchorId = useId().replace(/:/g, ""); 
    const _anchorName = `--anchor-${anchorId}`;
    const canUseDocument = mounted && typeof document !== "undefined";
    const anchorElRef = useRef<HTMLElement | null>(null);
    const floatingRef = useRef<HTMLElement | null>(null);
    const autoFlip = options?.autoFlip === true;
    const open = options?.open === true;
    const preferredPlacement = options?.preferredPlacement || "bottom";
    const gap = options?.margin ?? options?.offset ?? 0;
    const [placement, setPlacement] = useState<AnchorPlacement>(preferredPlacement);
    const [isPositioned, setIsPositioned] = useState(false);
    const floatingStyle = useMemo(() => {
        const style = getPlacementStyle(placement, gap);
        return { ...style, positionAnchor: _anchorName };
    }, [_anchorName, gap, placement]);

    const resolveNextPlacement = (currentPlacement: AnchorPlacement) => {
        if (!floatingRef.current || !anchorElRef.current) {
            return currentPlacement;
        }

        const hysteresisPx = 8;
        const floatingRect = floatingRef.current.getBoundingClientRect();
        const anchorRect = anchorElRef.current.getBoundingClientRect();
        const orderedCandidates = placementOrderMap[preferredPlacement];

        const projected = orderedCandidates.map((candidate) => {
            const rect = getProjectedRect(candidate, anchorRect, floatingRect, gap);
            const overflow = getOverflowScore(rect);
            return { candidate, overflow };
        });

        const currentEntry = projected.find((entry) => entry.candidate === currentPlacement) || projected[0];
        const firstThatFits = projected.find((entry) => entry.overflow === 0);

        if (currentEntry.overflow === 0) {
            return currentPlacement;
        }

        if (firstThatFits) {
            return firstThatFits.candidate;
        }

        const bestFallback = projected.reduce((best, next) => {
            if (next.overflow < best.overflow) return next;
            if (next.overflow === best.overflow && next.candidate === currentPlacement) return next;
            return best;
        }, projected[0]);

        if (bestFallback.overflow + hysteresisPx < currentEntry.overflow) {
            return bestFallback.candidate;
        }

        return currentPlacement;
    };

    useIsomorphicLayoutEffect(() => {
        if (!autoFlip || !open || !canUseDocument) {
            return;
        }

        setPlacement((currentPlacement) => resolveNextPlacement(currentPlacement));
    }, [autoFlip, canUseDocument, gap, open, preferredPlacement]);

    useEffect(() => {
        if (!autoFlip || !open || !canUseDocument || !floatingRef.current || !anchorElRef.current) {
            return;
        }

        const resolvePlacement = () => {
            setPlacement((currentPlacement) => resolveNextPlacement(currentPlacement));
        };

        let frameId: number | null = null;
        const scheduleResolvePlacement = () => {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }

            frameId = requestAnimationFrame(() => {
                resolvePlacement();
                frameId = null;
            });
        };

        resolvePlacement();

        window.addEventListener("resize", scheduleResolvePlacement);
        window.addEventListener("scroll", scheduleResolvePlacement, true);

        return () => {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
            }
            window.removeEventListener("resize", scheduleResolvePlacement);
            window.removeEventListener("scroll", scheduleResolvePlacement, true);
        };
    }, [autoFlip, canUseDocument, gap, open, preferredPlacement]);

    useEffect(() => {
        if (!autoFlip) {
            setPlacement(preferredPlacement);
        }
    }, [autoFlip, preferredPlacement]);

    useEffect(() => {
        if (!open || !canUseDocument) {
            setIsPositioned(false);
            return;
        }

        const rafId = requestAnimationFrame(() => {
            if (anchorElRef.current && floatingRef.current) {
                setIsPositioned(true);
            }
        });

        return () => cancelAnimationFrame(rafId);
    }, [open, canUseDocument]);

    const root = useMemo(() => {
        const hasExplicitAnchor = (() => {
            let found = false;

            addPropsToChildren(
                children,
                (element) => {
                    if (element.props.className?.includes(anchorName)) {
                        found = true;
                    }

                    return false;
                },
                () => ({})
            );

            return found;
        })();

        let foundAnchor = false;

        // Pass 1: Look for .--tooltip-anchor recursively
        return addPropsToChildren(
            children,
            (element) => {
                // CONDITION: We only want to modify the Root (first element) 
                // OR the element that explicitly has the anchor class.
                // const isRoot = !foundAnchor; // This will stay true for the very first node
                // const isAnchor = element.props.className?.includes(anchorName);
                
                // // We set foundAnchor to true once we hit the target 
                // // so we don't accidentally treat deeper nodes as "root"
                // if (isAnchor) foundAnchor = true; 
                
                // return isRoot || isAnchor;
                const isMatch = element.props.className?.includes(anchorName);
                if (isMatch) foundAnchor = true;
                return isMatch || !foundAnchor; // If we haven't found any anchor yet, keep looking. Once we find one, stop adding props to others.
            },
            (index, element) => {
                const isAnchor = element.props.className?.includes(anchorName);
                const isRoot = index === 0;
                const shouldApplyAnchorName = isAnchor || (!hasExplicitAnchor && isRoot);

                const props: any = {};

                // 1. If it's the anchor (Knob), give it the CSS ID
                if (shouldApplyAnchorName) {
                    props.style = { ...element.props.style, anchorName: _anchorName };
                    props.ref = (node: HTMLElement | null) => {
                        anchorElRef.current = node;

                        const existingRef = element.props.ref;
                        if (typeof existingRef === "function") {
                            existingRef(node);
                        } else if (existingRef && typeof existingRef === "object") {
                            existingRef.current = node;
                        }
                    };
                }

                // 2. If it's the root (the whole Slider), give it the Hover listeners
                // This ensures hovering ANYWHERE on the slider shows the tooltip
                if (isRoot) {
                    props.onMouseEnter = (e: any) => {
                        setHovered(true);
                        element.props.onMouseEnter?.(e);
                    };
                    props.onMouseLeave = (e: any) => {
                        setHovered(false);
                        element.props.onMouseLeave?.(e);
                    };
                }

                return props;
            }
        );
    }, [children, anchorName, _anchorName]);

    return { 
        root, 
        hovered, 
        anchorName: _anchorName,
        canUseDocument,
        floatingRef,
        floatingStyle,
        placement,
        isPositioned,
    };

}

export default useAnchor;