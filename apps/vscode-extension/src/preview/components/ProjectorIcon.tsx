import * as React from 'react';

export interface IProjectorIconProps {
  className?: string;
}

export const ProjectorIcon: React.FunctionComponent<IProjectorIconProps> = ({
  className
}: React.PropsWithChildren<IProjectorIconProps>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || ""}>
      <path stroke="currentcolor" d="M5 7L3 5" />
      <path stroke="currentcolor" d="M9 6V3" />
      <path stroke="currentcolor" d="M13 7L15 5" />
      <circle stroke="currentcolor" cx="9" cy="13" r="3" />
      <path stroke="currentcolor" d="M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17" />
      <path stroke="currentcolor" d="M16 16h2" />
    </svg>
  );
};