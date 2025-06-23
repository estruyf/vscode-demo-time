import { useEffect, useState } from 'react';

export function useLoadingScreen() {
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for a moment then fade out
    const timer = setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
      }
      setIsLoading(false);
    }, 100);

    console.log('Loading screen will fade out in 100ms');

    return () => clearTimeout(timer);
  }, []);
}
