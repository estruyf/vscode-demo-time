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

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-base font-semibold mb-2">How to use</h3>
        <ol className="list-decimal list-inside text-xs space-y-1">
          <li>
            In your VSCode project, set <code className="bg-gray-200 px-1 rounded">demoTime.api.enabled</code> to <code className="bg-gray-200 px-1 rounded">true</code> in your settings.
          </li>
          <li>
            Set IDs to your demo steps.
          </li>
          <li>
            Use these IDs in the <strong>Command ID</strong> input.
          </li>
          <li>
            Save the settings and you are ready to go!
          </li>
        </ol>
      </div>
    </>
  );
};
