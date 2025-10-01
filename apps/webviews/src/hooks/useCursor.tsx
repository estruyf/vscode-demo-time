import { useEffect, useCallback, useRef, useState } from 'react';

export const useCursor = () => {
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<number | null>(null);

  const hideCursor = useCallback(() => {
    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }
    setCursorVisible(false);
  }, []);

  const resetCursorTimeout = useCallback(() => {
    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }
    setCursorVisible(true);
    cursorTimeoutRef.current = window.setTimeout(() => {
      setCursorVisible(false);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (cursorTimeoutRef.current) {
        window.clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, []);

  return {
    cursorVisible,
    resetCursorTimeout,
    hideCursor
  };
};