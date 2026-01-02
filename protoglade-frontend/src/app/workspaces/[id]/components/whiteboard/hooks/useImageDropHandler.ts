import { useCallback, useState, useRef, useEffect } from 'react';
import { validateImageFile, getImageDimensions } from '../imageUpload';
import { ImageElement } from '../types';
import { api } from '@/lib/api';

interface UseImageDropHandlerOptions {
  projectId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  onImageAdd: (image: ImageElement) => void;
}

export function useImageDropHandler({
  projectId,
  containerRef,
  zoom,
  pan,
  onImageAdd,
}: UseImageDropHandlerOptions) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;

    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }

    // Calculate canvas position from drop coordinates
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dropX = (e.clientX - rect.left - pan.x) / zoom;
    const dropY = (e.clientY - rect.top - pan.y) / zoom;

    try {
      setIsUploading(true);
      setUploadError(null);

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Scale down if too large (max 400px on longest side for initial placement)
      const maxSize = 400;
      let width = dimensions.width;
      let height = dimensions.height;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = width * scale;
        height = height * scale;
      }

      // Center the image on the drop point
      const x = dropX - width / 2;
      const y = dropY - height / 2;

      // Generate a temporary ID
      const tempId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Upload the image
      const uploadedImage = await api.uploadWhiteboardImage(projectId, file, {
        id: tempId,
        x,
        y,
        width,
        height,
      });

      // Add to canvas
      onImageAdd({
        id: uploadedImage.id,
        url: uploadedImage.url,
        s3Key: uploadedImage.s3Key,
        x: uploadedImage.x,
        y: uploadedImage.y,
        width: uploadedImage.width,
        height: uploadedImage.height,
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setTimeout(() => setUploadError(null), 3000);
    } finally {
      setIsUploading(false);
    }
  }, [containerRef, zoom, pan, projectId, onImageAdd]);

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragenter', handleDragEnter);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [containerRef, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    isDragOver,
    isUploading,
    uploadError,
  };
}
