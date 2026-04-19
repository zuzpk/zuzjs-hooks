import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

export type LensLayer = 'SHADOW' | 'BODY' | 'BORDER' | 'LABEL' | null;

interface ManualLensStyles extends CSSProperties {
  info?: string;
  title?: string;
}

const useCodeLens = (manualStyles?: Partial<Record<LensLayer & string, ManualLensStyles>>) => {
  const [isActive, setIsActive] = useState(false);
  const [hoveredLayer, setHoveredLayer] = useState<LensLayer>(null);
  const [focusedLayer, setFocusedLayer] = useState<LensLayer>(null);
  const [styles, setStyles] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const getContrastColor = (hexColor: string) => {
    // Basic logic to ensure text is visible against background
    // In a real ZuzJS util, you'd use a more complex Luminance formula
    if (!hexColor || hexColor === 'transparent') return 'inherit';
    return hexColor.includes('rgba(0,0,0') || hexColor === 'rgb(0, 0, 0)' ? '#fff' : 'inherit';
  };

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
    }
  }, [manualStyles]);

  useEffect(() => {
    capture();
    window.addEventListener('resize', capture);
    return () => window.removeEventListener('resize', capture);
  }, [capture]);

  return {
    rootRef, isActive, setIsActive, hoveredLayer, setHoveredLayer,
    focusedLayer, setFocusedLayer, styles, toggleLens: () => {
      setIsActive(!isActive);
      setFocusedLayer(null);
    }
  };
};

export default useCodeLens;