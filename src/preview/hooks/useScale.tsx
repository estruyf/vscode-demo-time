import { useEffect, useCallback, useState } from 'react';

const Slide_Width = 960;
const Slide_Height = 540;

export const useScale = (
  ref: React.RefObject<HTMLDivElement | null>,
  slideRef: React.RefObject<HTMLDivElement | null>
) => {
  const [value, setValue] = useState(0);

  const updateScale = useCallback(() => {
    if (!slideRef?.current || !ref?.current) {
      return;
    }

    const { width, height } = ref.current.getBoundingClientRect();
    const scale = Math.min(width / Slide_Width, height / Slide_Height);
    const scaledWidth = Slide_Width * scale;
    const scaledHeight = Slide_Height * scale;

    let scaleValue = 1;
    if (scale > 3.5) {
      scaleValue = 3.5;
    } else if (scaledWidth <= width && scaledHeight <= height) {
      scaleValue = scale;
    } else if (scaledWidth <= width) {
      scaleValue = width / Slide_Width;
    } else if (scaledHeight <= height) {
      scaleValue = height / Slide_Height;
    } else {
      scaleValue = 1;
    }
    document.documentElement.style.setProperty('--demotime-scale', `${scaleValue}`);
    setValue(scaleValue);
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

  return {
    scale: value,
    updateScale,
  };
};