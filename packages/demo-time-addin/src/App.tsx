import * as React from 'react';
import { FormContainer } from './components/FormContainer';
import { UsageInstructions } from './components/UsageInstructions';
import { useLoadingScreen } from './hooks/useLoadingScreen';

export const App: React.FC = () => {
  useLoadingScreen();

  return (
    <>
      <FormContainer />

      <UsageInstructions />
    </>
  );
};
