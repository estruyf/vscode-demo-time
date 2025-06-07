import * as React from 'react';
import { useState, useEffect } from 'react';
import { FormContainer } from './components/FormContainer';

export const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for a moment then fade out
    const timer = setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
      }
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <FormContainer />
    </>
  );
};
