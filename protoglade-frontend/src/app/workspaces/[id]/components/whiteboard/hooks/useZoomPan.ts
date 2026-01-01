import { useEffect, RefObject } from 'react';

export interface UseZoomPanOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export function useZoomPan({
  canvasRef,
  containerRef,
  setZoom,
  setPan,
}: UseZoomPanOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey) {
        const zoomSensitivity = 0.01;
        const delta = 1 - e.deltaY * zoomSensitivity;

        setZoom((prevZoom) => {
          const newZoom = Math.min(Math.max(prevZoom * delta, 0.1), 5);
          const zoomRatio = newZoom / prevZoom;

          setPan((prevPan) => ({
            x: mouseX - (mouseX - prevPan.x) * zoomRatio,
            y: mouseY - (mouseY - prevPan.y) * zoomRatio,
          }));

          return newZoom;
        });
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    // Attach to the container so wheel events still work when the cursor is over
    // DOM overlays (text boxes, floating toolbars), not just the <canvas>.
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, [canvasRef, containerRef, setZoom, setPan]);
}
