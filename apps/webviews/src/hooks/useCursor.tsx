import { useEffect, useCallback, useRef, useState } from 'react';

export const useCursor = () => {
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<number | null>(null);
  // While the pointer is on the slide controls, the cursor and controls stay visible
  const pausedRef = useRef(false);

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
    if (pausedRef.current) {
      return;
    }
    cursorTimeoutRef.current = window.setTimeout(() => {
      setCursorVisible(false);
    }, 5000);
  }, []);

  /**
   * Keeps the cursor visible while paused, and starts the hide timeout again when it resumes.
   */
  const pauseCursorTimeout = useCallback((paused: boolean) => {
    if (pausedRef.current === paused) {
      return;
    }
    pausedRef.current = paused;
    resetCursorTimeout();
  }, [resetCursorTimeout]);

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
    pauseCursorTimeout,
    hideCursor
  };
};