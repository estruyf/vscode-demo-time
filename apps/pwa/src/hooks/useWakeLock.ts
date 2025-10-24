import { useEffect, useRef } from 'react';

/**
 * Custom hook to keep the screen awake when the PWA is connected.
 * Uses the Screen Wake Lock API to prevent the device from sleeping.
 *
 * @param isConnected - Whether the PWA is connected to the VS Code extension
 *
 * The hook automatically:
 * - Requests wake lock when connected
 * - Releases wake lock when disconnected
 * - Re-requests wake lock when page becomes visible again
 * - Cleans up on unmount
 */
export const useWakeLock = (isConnected: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isConnected) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock activated');

          // Handle wake lock release (e.g., when tab becomes hidden)
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock released');
          });
        }
      } catch (err) {
        console.error('Failed to activate Wake Lock:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Wake Lock manually released');
        } catch (err) {
          console.error('Failed to release Wake Lock:', err);
        }
      }
    };

    if (isConnected) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-request wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isConnected) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount or when connection status changes
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isConnected]);

  return wakeLockRef;
};
