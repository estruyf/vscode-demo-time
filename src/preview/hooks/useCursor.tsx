import { useEffect, useCallback, useRef, useState } from 'react';

export default function useCursor() {
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<number | null>(null);

  const resetCursorTimeout = useCallback(() => {
    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }
    setCursorVisible(true);
    cursorTimeoutRef.current = window.setTimeout(() => {
      setCursorVisible(false);
    }, 2000);
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
    resetCursorTimeout
  };
}