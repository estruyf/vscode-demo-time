import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BringToFrontContextType {
  bringToFront: boolean;
  setBringToFront: (value: boolean) => void;
}

const BringToFrontContext = createContext<BringToFrontContextType | undefined>(undefined);

export const BringToFrontProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bringToFront, setBringToFront] = useState<boolean>(true);

  return (
    <BringToFrontContext.Provider value={{ bringToFront, setBringToFront }}>
      {children}
    </BringToFrontContext.Provider>
  );
};

export const useBringToFront = () => {
  const context = useContext(BringToFrontContext);
  if (!context) {
    throw new Error('useBringToFront must be used within BringToFrontProvider');
  }
  return context;
};
