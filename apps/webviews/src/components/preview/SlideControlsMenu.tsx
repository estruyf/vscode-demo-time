import * as React from 'react';
import { Icon } from 'vscrui';
import { cn } from '../../utils/cn';
import { SlideControl } from './SlideControl';

export interface ISlideMenuItem {
  id: string;
  label: string;
  iconName?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** When a boolean is provided the item becomes a toggle and exposes `aria-checked`. */
  pressed?: boolean;
}

export interface ISlideMenuGroup {
  id: string;
  /** Optional section header. Headerless groups are separated with a divider. */
  label?: string;
  items: ISlideMenuItem[];
}

export interface ISlideControlsMenuProps {
  groups: ISlideMenuGroup[];
  onOpenChange?: (open: boolean) => void;
}

export const SlideControlsMenu: React.FunctionComponent<ISlideControlsMenuProps> = ({ groups, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const reactId = React.useId();
  const menuId = `slide-controls-menu-${reactId}`;

  // Flattened item list keeps keyboard navigation independent of the grouping.
  const items = React.useMemo(() => groups.flatMap((group) => group.items), [groups]);

  React.useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const open = React.useCallback((index: number) => {
    setActiveIndex(index);
    setIsOpen(true);
  }, []);

  const close = React.useCallback((returnFocus = true) => {
    setIsOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // Move DOM focus to follow the active item while the menu is open.
  React.useEffect(() => {
    if (isOpen) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [isOpen, activeIndex]);

  // Close when interacting outside of the menu.
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    // Capture phase so the menu's Escape wins over the presentation's global Escape handler.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, close]);

  const handleTriggerClick = React.useCallback(() => {
    if (isOpen) {
      close(false);
    } else {
      open(0);
    }
  }, [isOpen, open, close]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) {
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Tab':
        // Let focus leave the menu naturally without trapping the user.
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      open(items.length - 1);
    }
  };

  const handleSelect = (item: ISlideMenuItem) => {
    item.onSelect();
    close();
  };

  // Index across the flattened list so refs/active state line up with keyboard nav.
  let flatIndex = -1;

  return (
    <div ref={wrapperRef} className="relative inline-flex" onKeyDown={isOpen ? handleMenuKeyDown : handleTriggerKeyDown}>
      <SlideControl
        ref={triggerRef}
        title="More actions"
        iconName="ellipsis"
        active={isOpen}
        ariaHasPopup="menu"
        ariaExpanded={isOpen}
        ariaControls={isOpen ? menuId : undefined}
        action={handleTriggerClick}
      />

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="More slide actions"
          aria-orientation="vertical"
          className={cn(
            'absolute bottom-full right-0 mb-2 z-[60] min-w-[230px] py-1 rounded-lg overflow-hidden',
            'bg-(--vscode-menu-background) text-(--vscode-menu-foreground)',
          )}
          style={{
            border: '1px solid var(--vscode-menu-border, var(--vscode-editorWidget-border, var(--vscode-widget-border)))',
            boxShadow: '0 6px 24px var(--vscode-widget-shadow)',
          }}
        >
          {groups.map((group, groupIndex) => {
            const headerId = `${menuId}-group-${group.id}`;
            return (
              <div
                key={group.id}
                role="group"
                aria-labelledby={group.label ? headerId : undefined}
              >
                {!group.label && groupIndex > 0 && (
                  <div
                    role="separator"
                    className="my-1 h-px"
                    style={{ backgroundColor: 'var(--vscode-menu-separatorBackground, var(--vscode-menu-border))' }}
                  />
                )}
                {group.label && (
                  <div
                    id={headerId}
                    className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60 select-none"
                  >
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const isActive = index === activeIndex;
                  const isToggle = typeof item.pressed === 'boolean';
                  const iconColor = isActive
                    ? 'text-(--vscode-menu-selectionForeground)!'
                    : 'text-(--vscode-menu-foreground)!';
                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      type="button"
                      role={isToggle ? 'menuitemcheckbox' : 'menuitem'}
                      aria-checked={isToggle ? item.pressed : undefined}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left outline-none',
                        isActive
                          ? 'bg-(--vscode-menu-selectionBackground) text-(--vscode-menu-selectionForeground)'
                          : 'text-(--vscode-menu-foreground)',
                      )}
                    >
                      <span className="inline-flex w-4 h-4 justify-center items-center shrink-0">
                        {item.iconName && (
                          <Icon name={item.iconName as never} className={cn(iconColor, 'inline-flex justify-center items-center')} />
                        )}
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {isToggle && item.pressed && (
                        <Icon name={'check' as never} className={cn(iconColor, 'inline-flex justify-center items-center shrink-0')} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
