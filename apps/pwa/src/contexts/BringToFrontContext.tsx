import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BringToFrontContextType {
  bringToFront: boolean;
  setBringToFront: (value: boolean) => void;
}

const BringToFrontContext = createContext<BringToFrontContextType | undefined>(undefined);

export const useBringToFront = () => {
  const context = useContext(BringToFrontContext);
  if (context === undefined) {
    throw new Error('useBringToFront must be used within a BringToFrontProvider');
  }
  return context;
};

interface BringToFrontProviderProps {
  children: ReactNode;
}

export const BringToFrontProvider: React.FC<BringToFrontProviderProps> = ({ children }) => {
  const [bringToFront, setBringToFront] = useState(false);

  return (
    <BringToFrontContext.Provider value={{ bringToFront, setBringToFront }}>
      {children}
    </BringToFrontContext.Provider>
  );
};
