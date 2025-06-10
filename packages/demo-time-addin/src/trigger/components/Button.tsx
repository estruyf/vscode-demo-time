import React from "react";

interface ButtonProps {
  id: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ id, onClick, className, children }) => {
  return (
    <button id={id} onClick={onClick} className={className}>
      {children}
    </button>
  );
};
