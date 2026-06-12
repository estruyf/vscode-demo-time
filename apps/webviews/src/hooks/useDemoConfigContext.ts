import { useContext } from 'react';
import { DemoConfigContext } from '../providers/DemoConfigProvider';

export const useDemoConfigContext = () => {
  const context = useContext(DemoConfigContext);
  if (!context) {
    throw new Error('useDemoConfigContext must be used within a DemoConfigProvider');
  }
  return context;
};
