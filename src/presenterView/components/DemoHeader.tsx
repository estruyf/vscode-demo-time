import * as React from 'react';

export interface DemoHeaderProps {
  title: string;
}

export const DemoHeader: React.FunctionComponent<DemoHeaderProps> = ({ title }) => {
  return (
    <div className="flex flex-col space-y-1.5 p-4">
      <h3 className="text-xl font-semibold leading-none tracking-tight">
        Demo: {title}
      </h3>
    </div>
  );
};