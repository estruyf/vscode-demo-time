import { useCallback } from 'react';

export const usePwaUpdates = () => {
  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      alert('Service workers not supported in this browser.');
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let updateFound = false;

      for (const registration of registrations) {
        // Force update check
        await registration.update();

        // Check if there's a waiting worker (new version available)
        if (registration.waiting) {
          updateFound = true;
          // Notify user that update is available
          if (confirm('A new version is available! Reload to update?')) {
            // Tell the waiting worker to skip waiting and become active
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            // Reload the page
            window.location.reload();
          }
          break;
        }
      }

      if (!updateFound) {
        alert("No updates available. You're running the latest version!");
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      alert('Error checking for updates. Please try again.');
    }
  }, []);

  return { checkForUpdates };
};
