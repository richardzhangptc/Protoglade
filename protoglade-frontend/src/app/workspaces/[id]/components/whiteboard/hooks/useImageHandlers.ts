import { useCallback, useRef } from 'react';
import { ImageElement } from '../types';

interface UseImageHandlersOptions {
  images: ImageElement[];
  setImages: React.Dispatch<React.SetStateAction<ImageElement[]>>;
  selectedElementId: string | null;
  selectedElementType: 'shape' | 'text' | 'sticky' | 'image' | null;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElementType: React.Dispatch<React.SetStateAction<'shape' | 'text' | 'sticky' | 'image' | null>>;
  onImageUpdate?: (image: ImageElement) => void;
  onImageDelete?: (id: string) => void;
  pushHistory: (action: {
    type: string;
    data: unknown;
  }) => void;
}

export function useImageHandlers({
  images,
  setImages,
  selectedElementId,
  selectedElementType,
  setSelectedElementId,
  setSelectedElementType,
  onImageUpdate,
  onImageDelete,
  pushHistory,
}: UseImageHandlersOptions) {
  const imageBeforeEdit = useRef<ImageElement | null>(null);

  const handleImageSelect = useCallback((id: string) => {
    setSelectedElementId(id);
    setSelectedElementType('image');
    const image = images.find((i) => i.id === id);
    if (image) {
      imageBeforeEdit.current = { ...image };
    }
  }, [images, setSelectedElementId, setSelectedElementType]);

  const handleImageMove = useCallback((id: string, x: number, y: number) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, x, y } : img))
    );
  }, [setImages]);

  const handleImageMoveEnd = useCallback(() => {
    const image = images.find((i) => i.id === selectedElementId);
    if (!image || selectedElementType !== 'image') return;

    const before = imageBeforeEdit.current;
    if (before && (before.x !== image.x || before.y !== image.y)) {
      pushHistory({
        type: 'updateImage',
        data: { before, after: { ...image } },
      });
      onImageUpdate?.(image);
    }
    imageBeforeEdit.current = { ...image };
  }, [images, selectedElementId, selectedElementType, pushHistory, onImageUpdate]);

  const handleImageResize = useCallback((id: string, width: number, height: number) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, width, height } : img))
    );
  }, [setImages]);

  const handleImageResizeEnd = useCallback(() => {
    const image = images.find((i) => i.id === selectedElementId);
    if (!image || selectedElementType !== 'image') return;

    const before = imageBeforeEdit.current;
    if (before && (before.width !== image.width || before.height !== image.height)) {
      pushHistory({
        type: 'updateImage',
        data: { before, after: { ...image } },
      });
      onImageUpdate?.(image);
    }
    imageBeforeEdit.current = { ...image };
  }, [images, selectedElementId, selectedElementType, pushHistory, onImageUpdate]);

  const handleImageDelete = useCallback((id: string) => {
    const image = images.find((i) => i.id === id);
    if (!image) return;

    setImages((prev) => prev.filter((img) => img.id !== id));
    pushHistory({
      type: 'deleteImage',
      data: { image },
    });
    setSelectedElementId(null);
    setSelectedElementType(null);
    onImageDelete?.(id);
  }, [images, setImages, setSelectedElementId, setSelectedElementType, pushHistory, onImageDelete]);

  const handleImageAdd = useCallback((image: ImageElement) => {
    setImages((prev) => [...prev, image]);
    pushHistory({
      type: 'addImage',
      data: { image },
    });
    setSelectedElementId(image.id);
    setSelectedElementType('image');
  }, [setImages, pushHistory, setSelectedElementId, setSelectedElementType]);

  return {
    handleImageSelect,
    handleImageMove,
    handleImageMoveEnd,
    handleImageResize,
    handleImageResizeEnd,
    handleImageDelete,
    handleImageAdd,
  };
}
