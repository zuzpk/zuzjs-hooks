import { useEffect, useRef, useState } from 'react';
import { CropShape } from './types';

const useImageCropper = (
  imageUrl: string,
  cropSize: number,
  cropShape: CropShape = CropShape.Circle,
  scale: number = 1
) => {

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [_scale, setScale] = useState(scale);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!canvas || !ctx || !img) return;

    canvas.width = cropSize;
    canvas.height = cropSize;

    ctx.clearRect(0, 0, cropSize, cropSize);

    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      img.width * _scale,
      img.height * _scale
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
      img.width * _scale,
      img.height * _scale
    );

    ctx.restore();

  };

  useEffect(draw, [_scale])

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        draw();
      };
      img.src = imageUrl;
    }
  }, [imageUrl, offset]);

  const handleMouseDown = () => setDragging(true);
  const handleMouseUp = () => setDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !imgRef.current) return;
    setOffset(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  };

  const crop = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  return {
    canvasRef,
    crop,
    setScale,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
  };
}

export default useImageCropper