import { useEffect, useCallback } from 'react';

const Slide_Width = 960;
const Slide_Height = 540;

export const useScale = (ref: React.RefObject<HTMLDivElement>, slideRef: React.RefObject<HTMLDivElement>) => {
  const updateScale = useCallback(() => {
    if (!slideRef.current || !ref.current) {
      return;
    }

    const { width, height } = ref.current.getBoundingClientRect();
    const scale = Math.min(width / Slide_Width, height / Slide_Height);
    const scaledWidth = Slide_Width * scale;
    const scaledHeight = Slide_Height * scale;

    if (scale > 3.5) {
      document.documentElement.style.setProperty('--demotime-scale', '3.5');
    } else if (scaledWidth <= width && scaledHeight <= height) {
      document.documentElement.style.setProperty('--demotime-scale', scale.toString());
    } else if (scaledWidth <= width) {
      document.documentElement.style.setProperty('--demotime-scale', (width / Slide_Width).toString());
    } else if (scaledHeight <= height) {
      document.documentElement.style.setProperty('--demotime-scale', (height / Slide_Height).toString());
    } else {
      document.documentElement.style.setProperty('--demotime-scale', '1');
    }
  }, [slideRef.current, ref.current]);

  useEffect(() => {
    const handleResize = () => {
      updateScale();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateScale]);

  useEffect(() => {
    if (!slideRef.current) {
      return;
    }

    const observer = new MutationObserver(() => {
      updateScale();
    });

    observer.observe(slideRef.current, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [slideRef, ref, updateScale]);

  return updateScale;
};