import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type LensLayer = 'SHADOW' | 'BODY' | 'BORDER' | 'LABEL' | null;
export type ActiveLensLayer = Exclude<LensLayer, null>;

export interface LensAvailability {
  SHADOW: boolean;
  BODY: boolean;
  BORDER: boolean;
  LABEL: boolean;
}

export interface LensElementDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  x: number;
  y: number;
}

export interface LensRelativeDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  x: number;
  y: number;
}

export interface LensCompactDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LensStyleSnapshot {
  layout: Record<string, string>;
  boxModel: Record<string, string>;
  typography: Record<string, string>;
  visual: Record<string, string>;
  motion: Record<string, string>;
  interactions: Record<string, string>;
  customProperties: Record<string, string>;
}

export interface LensPseudoStyleSnapshot {
  content: string;
  display: string;
  width: string;
  height: string;
  color: string;
  background: string;
  border: string;
  borderRadius: string;
  boxShadow: string;
  fontSize: string;
  fontWeight: string;
  opacity: string;
  visibility: string;
  position: string;
  inset: string;
}

export interface LensExtractedPseudoElement {
  styles: LensPseudoStyleSnapshot;
  styleSnapshot: LensStyleSnapshot;
  rebuildStyles: CSSProperties;
  selfDimensions: LensElementDimensions;
  parentDimensions: LensElementDimensions;
  relativeDimensions?: LensRelativeDimensions;
  compactDimensions: LensCompactDimensions;
}

export interface LensExtractedTextNode {
  index: number;
  type: 'text';
  content: string;
  parentIndex: number;
  depth: number;
}

export interface LensExplodedTreeNode {
  element: LensExtractedElement;
  children: LensExplodedTreeNode[];
}

export interface LensExtractedElement {
  index: number;
  type: 'element';
  path: string;
  tagName: string;
  id: string;
  className: string;
  text: string;
  depth: number;
  parentIndex: number | null;
  children: LensExplodedTreeNode[];
  styleSnapshot: LensStyleSnapshot;
  rebuildStyles: CSSProperties;
  selfDimensions: LensElementDimensions;
  parentDimensions: LensElementDimensions | null;
  relativeDimensions?: LensRelativeDimensions;
  compactDimensions: LensCompactDimensions;
  pseudo: {
    before: LensExtractedPseudoElement | null;
    after: LensExtractedPseudoElement | null;
  };
}

export type LensExtractedNode = LensExtractedElement | LensExtractedTextNode;

interface ManualLensStyles extends CSSProperties {
  info?: string;
  title?: string;
}

const DEFAULT_AVAILABILITY: LensAvailability = {
  SHADOW: false,
  BODY: true,
  BORDER: false,
  LABEL: true,
};

const hasVisualBackground = (value?: string) => {
  if (!value) return false;
  const bg = value.toLowerCase().trim();
  return bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgba(0,0,0,0)';
};

const hasVisualBorder = (computed: CSSStyleDeclaration) => {
  if (computed.borderStyle === 'none') return false;
  const borderWidth = Number.parseFloat(computed.borderWidth || '0');
  return borderWidth > 0;
};

const toDimensions = (rect: DOMRect): LensElementDimensions => ({
  width: rect.width,
  height: rect.height,
  top: rect.top,
  left: rect.left,
  right: rect.right,
  bottom: rect.bottom,
  x: rect.x,
  y: rect.y,
});

const toRelativeDimensions = (
  selfDimensions: LensElementDimensions,
  parentDimensions: LensElementDimensions,
): LensRelativeDimensions => ({
  width: selfDimensions.width - parentDimensions.width,
  height: selfDimensions.height - parentDimensions.height,
  top: selfDimensions.top - parentDimensions.top,
  left: selfDimensions.left - parentDimensions.left,
  right: selfDimensions.right - parentDimensions.right,
  bottom: selfDimensions.bottom - parentDimensions.bottom,
  x: selfDimensions.x - parentDimensions.x,
  y: selfDimensions.y - parentDimensions.y,
});

const toCompactDimensions = (dimensions: LensElementDimensions): LensCompactDimensions => ({
  x: dimensions.x,
  y: dimensions.y,
  width: dimensions.width,
  height: dimensions.height,
});

const STYLE_GROUP_KEYS = {
  layout: [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'overflow', 'overflow-x', 'overflow-y',
    'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-direction', 'flex-wrap', 'align-items', 'align-content',
    'justify-content', 'justify-items', 'justify-self', 'order', 'gap', 'row-gap', 'column-gap', 'grid-template-columns',
    'grid-template-rows', 'grid-auto-flow', 'grid-column', 'grid-row',
  ],
  boxModel: [
    'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'outline', 'outline-offset',
  ],
  typography: [
    'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
    'text-transform', 'text-align', 'text-decoration', 'text-shadow', 'white-space', 'word-break', 'text-overflow',
  ],
  visual: [
    'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    'background-clip', 'background-origin', 'box-shadow', 'opacity', 'visibility', 'filter', 'backdrop-filter',
    'mix-blend-mode', 'isolation', 'clip-path',
  ],
  motion: [
    'transform', 'transform-origin', 'transform-style', 'perspective', 'transition', 'transition-property',
    'transition-duration', 'transition-timing-function', 'animation', 'animation-name', 'animation-duration',
    'animation-timing-function', 'animation-delay', 'will-change',
  ],
  interactions: [
    'cursor', 'pointer-events', 'user-select', 'touch-action',
  ],
} as const;

const REBUILD_STYLE_KEYS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'padding', 'border', 'border-radius',
  'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-transform', 'text-align', 'white-space', 'word-break',
  'box-shadow', 'opacity', 'visibility', 'filter', 'backdrop-filter',
  'transform', 'transform-origin', 'transition', 'animation',
  'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
  'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-column', 'grid-row',
  'overflow', 'overflow-x', 'overflow-y',
  'pointer-events', 'cursor',
] as const;

const pickStyleMap = (computed: CSSStyleDeclaration, keys: readonly string[]): Record<string, string> => {
  const snapshot: Record<string, string> = {};
  keys.forEach((key) => {
    snapshot[key] = computed.getPropertyValue(key);
  });
  return snapshot;
};

const extractCustomProperties = (computed: CSSStyleDeclaration): Record<string, string> => {
  const customProperties: Record<string, string> = {};
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (property.startsWith('--')) {
      customProperties[property] = computed.getPropertyValue(property);
    }
  }
  return customProperties;
};

const buildStyleSnapshot = (computed: CSSStyleDeclaration): LensStyleSnapshot => ({
  layout: pickStyleMap(computed, STYLE_GROUP_KEYS.layout),
  boxModel: pickStyleMap(computed, STYLE_GROUP_KEYS.boxModel),
  typography: pickStyleMap(computed, STYLE_GROUP_KEYS.typography),
  visual: pickStyleMap(computed, STYLE_GROUP_KEYS.visual),
  motion: pickStyleMap(computed, STYLE_GROUP_KEYS.motion),
  interactions: pickStyleMap(computed, STYLE_GROUP_KEYS.interactions),
  customProperties: extractCustomProperties(computed),
});

const toReactStyleKey = (cssProperty: string) => cssProperty.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

const buildRebuildStyles = (computed: CSSStyleDeclaration): CSSProperties => {
  const rebuildStyles: CSSProperties = {};
  REBUILD_STYLE_KEYS.forEach((key) => {
    const value = computed.getPropertyValue(key);
    if (!value) return;
    (rebuildStyles as Record<string, string>)[toReactStyleKey(key)] = value;
  });
  return rebuildStyles;
};

const getNodeDepth = (element: HTMLElement, root: HTMLElement): number => {
  if (element === root) return 0;
  let depth = 0;
  let cursor: HTMLElement | null = element;
  while (cursor && cursor !== root) {
    depth += 1;
    cursor = cursor.parentElement;
  }
  return depth;
};

const parseCssLength = (value: string): number | null => {
  if (!value || value === 'auto') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolvePseudoRect = (hostRect: DOMRect, pseudo: CSSStyleDeclaration): LensElementDimensions => {
  const width = parseCssLength(pseudo.width) ?? 0;
  const height = parseCssLength(pseudo.height) ?? 0;
  const top = parseCssLength(pseudo.top);
  const right = parseCssLength(pseudo.right);
  const bottom = parseCssLength(pseudo.bottom);
  const left = parseCssLength(pseudo.left);

  const resolvedLeft = left != null
    ? hostRect.left + left
    : right != null
      ? hostRect.right - right - width
      : hostRect.left;

  const resolvedTop = top != null
    ? hostRect.top + top
    : bottom != null
      ? hostRect.bottom - bottom - height
      : hostRect.top;

  return {
    width,
    height,
    top: resolvedTop,
    left: resolvedLeft,
    right: resolvedLeft + width,
    bottom: resolvedTop + height,
    x: resolvedLeft,
    y: resolvedTop,
  };
};

const snapshotPseudoStyle = (element: HTMLElement, pseudoSelector: '::before' | '::after'): LensExtractedPseudoElement | null => {
  const pseudo = window.getComputedStyle(element, pseudoSelector);
  const hasRenderableContent = pseudo.content && pseudo.content !== 'none' && pseudo.content !== 'normal' && pseudo.content !== '""';
  const hasVisualStyle =
    pseudo.display !== 'none' ||
    pseudo.width !== 'auto' ||
    pseudo.height !== 'auto' ||
    pseudo.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
    pseudo.borderStyle !== 'none' ||
    pseudo.boxShadow !== 'none';

  if (!hasRenderableContent && !hasVisualStyle) {
    return null;
  }

  const hostRect = element.getBoundingClientRect();
  const groupedStyleSnapshot = buildStyleSnapshot(pseudo);
  const rebuildStyles = buildRebuildStyles(pseudo);
  const pseudoStyles: LensPseudoStyleSnapshot = {
    content: pseudo.content,
    display: pseudo.display,
    width: pseudo.width,
    height: pseudo.height,
    color: pseudo.color,
    background: pseudo.background,
    border: pseudo.border,
    borderRadius: pseudo.borderRadius,
    boxShadow: pseudo.boxShadow,
    fontSize: pseudo.fontSize,
    fontWeight: pseudo.fontWeight,
    opacity: pseudo.opacity,
    visibility: pseudo.visibility,
    position: pseudo.position,
    inset: `${pseudo.top} ${pseudo.right} ${pseudo.bottom} ${pseudo.left}`,
  };

  const selfDimensions = resolvePseudoRect(hostRect, pseudo);
  const parentDimensions = toDimensions(hostRect);

  return {
    styles: pseudoStyles,
    styleSnapshot: groupedStyleSnapshot,
    rebuildStyles,
    selfDimensions,
    parentDimensions,
    relativeDimensions: toRelativeDimensions(selfDimensions, parentDimensions),
    compactDimensions: toCompactDimensions(selfDimensions),
  };
};

const getElementPath = (element: HTMLElement, root: HTMLElement): string => {
  if (element === root) return element.tagName.toLowerCase();

  const segments: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    const tag = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === current?.tagName,
    );
    const siblingIndex = siblings.indexOf(current) + 1;
    segments.unshift(`${tag}:nth-of-type(${siblingIndex})`);
    current = parent;
  }

  return [root.tagName.toLowerCase(), ...segments].join(' > ');
};

const buildExplodedTree = (elements: LensExtractedElement[]): LensExplodedTreeNode[] => {
  return elements
    .filter((el) => el.parentIndex == null)
    .map((el) => ({
      element: el,
      children: el.children,
    }));
};

const useCodeLens = (manualStyles?: Partial<Record<LensLayer & string, ManualLensStyles>>) => {
  const [isActive, setIsActive] = useState(false);
  const [hoveredLayer, setHoveredLayer] = useState<LensLayer>(null);
  const [focusedLayer, setFocusedLayer] = useState<LensLayer>(null);
  const [styles, setStyles] = useState<CSSProperties | null>(null);
  const [availability, setAvailability] = useState<LensAvailability>(DEFAULT_AVAILABILITY);
  const [extractedElements, setExtractedElements] = useState<LensExtractedNode[]>([]);
  const explodedTree = useMemo(() => buildExplodedTree(extractedElements.filter((e) => e.type === 'element') as LensExtractedElement[]), [extractedElements]);
  const rootRef = useRef<HTMLDivElement>(null);

  const capture = useCallback(() => {
    if (rootRef.current?.firstChild) {
      const target = rootRef.current.firstChild as HTMLElement;
      const computed = window.getComputedStyle(target);
      
      const autoStyles: CSSProperties = {
        width: computed.width,
        height: computed.height,
        borderRadius: computed.borderRadius,
        background: computed.backgroundColor,
        border: computed.border,
        boxShadow: computed.boxShadow,
        color: computed.color,
        fontSize: computed.fontSize,
        padding: computed.padding,
        display: computed.display,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        fontWeight: computed.fontWeight,
      };

      // Merge Manual Styles if provided, else use Auto
      setStyles({ ...autoStyles, ...manualStyles?.BODY }); 

      setAvailability({
        SHADOW: computed.boxShadow !== 'none' || Boolean(manualStyles?.SHADOW?.boxShadow),
        BODY: hasVisualBackground(computed.backgroundColor) || hasVisualBackground(manualStyles?.BODY?.background as string),
        BORDER: hasVisualBorder(computed) || Boolean(manualStyles?.BORDER?.border),
        LABEL: true,
      });

      const nodes = [target, ...Array.from(target.querySelectorAll<HTMLElement>('*'))];
      const elementIndexMap = new Map<HTMLElement, number>();
      let currentIndex = 0;

      const elementEntries: Omit<LensExtractedElement, 'children'>[] = [];
      const textEntries: LensExtractedTextNode[] = [];
      const elementChildrenRefs: Map<number, number[]> = new Map();

      nodes.forEach((node) => {
        elementIndexMap.set(node, currentIndex);
        currentIndex += 1;
      });

      nodes.forEach((node, nodeIdx) => {
        const computedNode = window.getComputedStyle(node);
        const selfRect = node.getBoundingClientRect();
        const parentElement = node.parentElement instanceof HTMLElement ? node.parentElement : null;
        const parentRect = parentElement && parentElement !== rootRef.current
          ? parentElement.getBoundingClientRect()
          : null;
        const parentIndex = parentElement && elementIndexMap.has(parentElement)
          ? elementIndexMap.get(parentElement) ?? null
          : null;
        const selfDimensions = toDimensions(selfRect);
        const parentDimensions = parentRect ? toDimensions(parentRect) : null;
        const styleSnapshot = buildStyleSnapshot(computedNode);
        const rebuildStyles = buildRebuildStyles(computedNode);

        const elementChildIndexes: number[] = [];
        Array.from(node.childNodes).forEach((childNode) => {
          if (childNode instanceof HTMLElement) {
            const childIndex = elementIndexMap.get(childNode);
            if (typeof childIndex === 'number') {
              elementChildIndexes.push(childIndex);
            }
          } else if (childNode.nodeType === Node.TEXT_NODE) {
            const textContent = (childNode.textContent || '').trim();
            if (textContent) {
              const textIndex = elementEntries.length + textEntries.length;
              textEntries.push({
                index: textIndex,
                type: 'text',
                content: textContent,
                parentIndex: nodeIdx,
                depth: getNodeDepth(node, target) + 1,
              });
            }
          }
        });

        elementChildrenRefs.set(nodeIdx, elementChildIndexes);

        elementEntries.push({
          index: nodeIdx,
          type: 'element',
          path: getElementPath(node, target),
          tagName: node.tagName.toLowerCase(),
          id: node.id,
          className: node.className,
          text: node.children.length === 0 ? (node.textContent || '').trim() : '',
          depth: getNodeDepth(node, target),
          parentIndex,
          styleSnapshot,
          rebuildStyles,
          selfDimensions,
          parentDimensions,
          relativeDimensions: parentDimensions ? toRelativeDimensions(selfDimensions, parentDimensions) : undefined,
          compactDimensions: toCompactDimensions(selfDimensions),
          pseudo: {
            before: snapshotPseudoStyle(node, '::before'),
            after: snapshotPseudoStyle(node, '::after'),
          },
        });
      });

      const treeNodeMap = new Map<number, LensExplodedTreeNode>();

      const buildTreeNode = (elementIndex: number): LensExplodedTreeNode => {
        if (treeNodeMap.has(elementIndex)) {
          return treeNodeMap.get(elementIndex)!;
        }

        const element = elementEntries[elementIndex];
        if (!element) throw new Error(`Element at index ${elementIndex} not found`);

        const childElementIndexes = elementChildrenRefs.get(elementIndex) || [];
        const childrenNodes: LensExplodedTreeNode[] = childElementIndexes
          .map((childIdx) => buildTreeNode(childIdx))
          .filter((n) => n !== null);

        const treeNode: LensExplodedTreeNode = {
          element: { ...element, children: childrenNodes } as LensExtractedElement,
          children: childrenNodes,
        };

        treeNodeMap.set(elementIndex, treeNode);
        return treeNode;
      };

      const finalElements: LensExtractedElement[] = elementEntries.map((el) => {
        const childElementIndexes = elementChildrenRefs.get(el.index) || [];
        const childrenNodes: LensExplodedTreeNode[] = childElementIndexes
          .map((childIdx) => buildTreeNode(childIdx))
          .filter((n) => n !== null);
        return { ...el, children: childrenNodes } as LensExtractedElement;
      });

      const extracted: LensExtractedNode[] = [...finalElements, ...textEntries].sort((a, b) => a.index - b.index);
      setExtractedElements(extracted);
    }
  }, [manualStyles]);

  useEffect(() => {
    capture();
    window.addEventListener('resize', capture);
    return () => window.removeEventListener('resize', capture);
  }, [capture]);

  const toggleLens = useCallback(() => {
    setIsActive((prev) => !prev);
    setHoveredLayer(null);
    setFocusedLayer(null);
  }, []);

  return {
    rootRef, isActive, setIsActive, hoveredLayer, setHoveredLayer,
    focusedLayer, setFocusedLayer, styles, availability, extractedElements, explodedTree, toggleLens,
  };
};

export default useCodeLens;