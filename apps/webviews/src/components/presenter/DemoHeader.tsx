import * as React from 'react';

export interface DemoHeaderProps {
  prefix?: string;
  title: string;
  icon?: React.ReactNode;
}

export const DemoHeader: React.FunctionComponent<DemoHeaderProps> = ({
  prefix,
  title,
  icon
}) => {
  return (
    <div className="presenter-card-header flex items-center gap-3 px-5 py-4 border-b border-(--vscode-panel-border)/50">
      {icon && (
        <div className="flex-shrink-0 w-5 h-5 text-(--vscode-descriptionForeground)">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold leading-none tracking-tight text-(--vscode-foreground)">
        {prefix && (
          <span className="text-(--vscode-descriptionForeground) font-medium">{prefix}: </span>
        )}
        {title}
      </h3>
    </div>
  );
};