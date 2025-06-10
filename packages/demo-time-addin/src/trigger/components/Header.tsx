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
    <div className="header">
      <img className='mx-auto h-4 w-4' src={logoUrl} alt={`${title} Logo`} />
      <h2>{title}</h2>
    </div>
  );
};
