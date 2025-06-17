import { useEffect, useCallback, useRef, useState } from 'react';

export default function useCursor() {
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<number | null>(null);
  const isManuallyHiddenRef = useRef(false);

  const resetCursorTimeout = useCallback(() => {
    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }

    // If cursor was manually hidden, add 200ms delay before showing
    if (isManuallyHiddenRef.current) {
      isManuallyHiddenRef.current = false;
      cursorTimeoutRef.current = window.setTimeout(() => {
        setCursorVisible(true);
        cursorTimeoutRef.current = window.setTimeout(() => {
          setCursorVisible(false);
        }, 5000);
      }, 200);
    } else {
      // Normal behavior: show cursor immediately
      setCursorVisible(true);
      cursorTimeoutRef.current = window.setTimeout(() => {
        setCursorVisible(false);
      }, 5000);
    }
  }, []);

  const hideCursor = useCallback(() => {
    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }
    setCursorVisible(false);
    isManuallyHiddenRef.current = true;
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
}