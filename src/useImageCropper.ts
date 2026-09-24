import { useEffect, useRef, useState } from 'react';
import { CropShape } from './types';

const useImageCropper = (
  imageUrl: string,
  cropSize: number,
  cropShape: CropShape = CropShape.Circle,
  zoomScale: number = 1
) => {

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [_zoomScale, setZoomScale] = useState(zoomScale);

  const [baseScale, setBaseScale] = useState(1);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const getClampedOffset = (targetX: number, targetY: number, customZoom = _zoomScale) => {
    const img = imgRef.current;
    if (!img) return { x: targetX, y: targetY };

    const finalScale = baseScale * customZoom;
    const renderWidth = img.width * finalScale;
    const renderHeight = img.height * finalScale;

    // Calculate boundaries: offsets must remain between 0 and the maximum overflow difference
    const minX = cropSize - renderWidth;
    const minY = cropSize - renderHeight;

    // If the scaled image size exactly matches or is smaller than the box, fix it to 0
    const clampedX = renderWidth <= cropSize ? (cropSize - renderWidth) / 2 : Math.min(0, Math.max(minX, targetX));
    const clampedY = renderHeight <= cropSize ? (cropSize - renderHeight) / 2 : Math.min(0, Math.max(minY, targetY));

    return { x: clampedX, y: clampedY };
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!canvas || !ctx || !img) return;

    canvas.width = cropSize;
    canvas.height = cropSize;

    ctx.clearRect(0, 0, cropSize, cropSize);

    const finalScale = baseScale * _zoomScale;
    const renderWidth = img.width * finalScale;
    const renderHeight = img.height * finalScale;

    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      renderWidth,
      renderHeight
    );
    ctx.globalAlpha = 1.0;
    ctx.save();

    if (cropShape === CropShape.Circle) {
      ctx.beginPath();
      ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      renderWidth,
      renderHeight
    );

    ctx.restore();

  };

  useEffect(draw, [_zoomScale, baseScale, offset, cropSize, cropShape]);

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;

        const scaleX = cropSize / img.width;
        const scaleY = cropSize / img.height;

        const calculatedFitScale = Math.max(scaleX, scaleY);
        setBaseScale(calculatedFitScale);

        setOffset({
          x: (cropSize - img.width * calculatedFitScale) / 2,
          y: (cropSize - img.height * calculatedFitScale) / 2
        });

        // draw();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, cropSize]);

  const handleScaleChange = (newZoom: number) => {
    setZoomScale(newZoom);
    setOffset(prev => getClampedOffset(prev.x, prev.y, newZoom));
  };

  const handleMouseDown = () => setDragging(true);
  const handleMouseUp = () => setDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !imgRef.current) return;
    setOffset(prev => {
      const nextX = prev.x + e.movementX;
      const nextY = prev.y + e.movementY;      
      return getClampedOffset(nextX, nextY);
    });
  };

  const crop = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  return {
    canvasRef,
    crop,
    setScale: handleScaleChange,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
  };
}

export default useImageCropper