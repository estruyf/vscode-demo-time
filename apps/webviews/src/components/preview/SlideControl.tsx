import * as React from 'react';
import { Icon } from 'vscrui';
import { cn } from '../../utils/cn';

export interface ISlideControlProps {
  action: () => void;
  iconName?: string;
  icon?: React.ReactNode;
  title: string;
  disabled?: boolean;
  /** Renders the larger, full-opacity navigation styling (previous/next). */
  isSlideControl?: boolean;
  /** Highlights the control with the accent color to indicate an active/toggled state. */
  active?: boolean;
  className?: string;
  /** Reflects the pressed state of a toggle button to assistive technologies. */
  ariaPressed?: boolean;
  ariaHasPopup?: boolean | 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid';
  ariaExpanded?: boolean;
  ariaControls?: string;
  id?: string;
  tabIndex?: number;
}

export const SlideControl = React.forwardRef<HTMLButtonElement, ISlideControlProps>(
  (
    {
      action,
      iconName,
      icon,
      title,
      disabled,
      isSlideControl,
      active,
      className,
      ariaPressed,
      ariaHasPopup,
      ariaExpanded,
      ariaControls,
      id,
      tabIndex,
    },
    ref,
  ) => {
    // The codicon font sets its own `color`, so the accent has to be applied with `!` to win.
    const codiconColor = active
      ? 'text-(--color-demo-time-accent)!'
      : 'text-(--vscode-editorWidget-foreground)!';
    // SVG icons inherit `currentColor`, so a regular text color on the wrapper is enough.
    const svgColor = active ? 'text-(--color-demo-time-accent)' : 'text-(--vscode-editorWidget-foreground)';

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        title={title}
        aria-label={title}
        aria-pressed={ariaPressed}
        aria-haspopup={ariaHasPopup}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        tabIndex={tabIndex}
        onClick={action}
        disabled={disabled}
        className={cn(
          'inline-flex justify-center items-center rounded-lg p-2 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vscode-focusBorder)',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          active
            ? 'bg-(--color-demo-time-accent-low) hover:bg-(--color-demo-time-accent-low)'
            : 'hover:bg-(--vscode-toolbar-hoverBackground)',
          !isSlideControl && !active ? 'opacity-80 hover:opacity-100' : '',
          className,
        )}
      >
        {iconName && (
          <Icon name={iconName as never} className={cn(codiconColor, 'inline-flex justify-center items-center')} />
        )}
        {icon && <span className={cn(svgColor, 'inline-flex justify-center items-center')}>{icon}</span>}
      </button>
    );
  },
);

SlideControl.displayName = 'SlideControl';
