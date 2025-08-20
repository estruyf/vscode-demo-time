import * as React from 'react';

export interface DemoHeaderProps {
  prefix?: string;
  title: string;
}

export const DemoHeader: React.FunctionComponent<DemoHeaderProps> = ({
  prefix,
  title
}) => {
  return (
    <div className="flex flex-col space-y-1.5 p-4">
      <h3 className="text-xl font-semibold leading-none tracking-tight">
        {prefix ? `${prefix}: ` : ``}{title}
      </h3>
    </div>
  );
};