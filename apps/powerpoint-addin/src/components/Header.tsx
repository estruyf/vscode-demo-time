import * as React from 'react';

interface HeaderProps {
  logoUrl?: string;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logoUrl = "https://raw.githubusercontent.com/estruyf/vscode-demo-time/main/assets/logo/demotime-square.png",
  title = "Demo Time Trigger"
}) => {
  return (
    <header className="text-center mb-5 flex items-center justify-center gap-2">
      <img className='h-10 w-10' src={logoUrl} alt={`${title} Logo`} />
      <h2 className='sr-only'>{title}</h2>
    </header>
  );
};
