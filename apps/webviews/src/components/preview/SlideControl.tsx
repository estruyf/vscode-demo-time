import * as React from 'react';
import { Icon } from 'vscrui';

export interface ISlideControlProps {
  action: () => void;
  iconName?: string;
  icon?: React.ReactNode;
  title: string;
  disabled?: boolean;
  isSlideControl?: boolean;
  className?: string;
}

export const SlideControl: React.FunctionComponent<ISlideControlProps> = ({
  action,
  iconName,
  icon,
  title,
  disabled,
  isSlideControl,
  className,
}: React.PropsWithChildren<ISlideControlProps>) => {
  return (
    <button
      title={title}
      onClick={action}
      disabled={disabled}
      className={`p-2 inline-flex justify-center items-center rounded-xs disabled:opacity-50 disabled:cursor-not-allowed ${!isSlideControl ? ' opacity-70 hover:opacity-100' : ''} ${className ? className : "hover:bg-(--vscode-toolbar-hoverBackground)"}`}
    >
      <span className="sr-only">{title}</span>
      {iconName && <Icon name={iconName as never} className="text-(--vscode-editorWidget-foreground)! inline-flex justify-center items-center" />}
      {icon}
    </button>
  );
};
