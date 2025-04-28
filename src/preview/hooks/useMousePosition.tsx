import { useState, useCallback } from 'react';

export const useMousePosition = (slideRef: React.RefObject<HTMLDivElement>, scale: number) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = slideRef.current?.getBoundingClientRect();
      if (rect) {
        setMousePosition({
          x: Math.round((event.clientX - rect.left) / scale),
          y: Math.round((event.clientY - rect.top) / scale),
        });
      }
    },
    [slideRef, scale]
  );

  return { mousePosition, handleMouseMove };
};