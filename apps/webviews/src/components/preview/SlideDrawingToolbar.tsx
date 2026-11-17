import * as React from 'react';
import { Eraser, Highlighter, Pen, Trash2, X } from 'lucide-react';
import { SLIDE_DRAWING_COLORS, SlideDrawingTool } from '@demotime/common';
import { SlideControl } from './SlideControl';
import { cn } from '../../utils/cn';

export interface ISlideDrawingToolbarProps {
  tool: SlideDrawingTool;
  color: string;
  canClear: boolean;
  onToolChange: (tool: SlideDrawingTool) => void;
  onColorChange: (color: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const TOOLS: { tool: SlideDrawingTool; title: string; icon: React.ReactNode }[] = [
  { tool: 'pen', title: 'Pen', icon: <Pen className="w-4 h-4" /> },
  { tool: 'highlighter', title: 'Highlighter', icon: <Highlighter className="w-4 h-4" /> },
  { tool: 'eraser', title: 'Eraser', icon: <Eraser className="w-4 h-4" /> },
];

const Divider: React.FunctionComponent = () => (
  <div
    aria-hidden="true"
    className="h-px self-stretch mx-1 bg-(--vscode-editorWidget-foreground) opacity-20"
  />
);

/**
 * The tools to draw on the slide. It shows on the left of the preview while drawing is on.
 */
export const SlideDrawingToolbar: React.FunctionComponent<ISlideDrawingToolbarProps> = ({
  tool,
  color,
  canClear,
  onToolChange,
  onColorChange,
  onClear,
  onClose,
}: ISlideDrawingToolbarProps) => {
  return (
    <div
      data-slide-drawing-toolbar
      role="toolbar"
      aria-label="Drawing tools"
      aria-orientation="vertical"
      className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-0.5 rounded-2xl px-1.5 py-2 bg-(--vscode-editorWidget-background)"
      style={{
        cursor: 'default',
        border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
        boxShadow: '0 0 12px 0 var(--vscode-widget-shadow)',
      }}
    >
      {TOOLS.map((item) => (
        <SlideControl
          key={item.tool}
          title={item.title}
          icon={item.icon}
          active={tool === item.tool}
          ariaPressed={tool === item.tool}
          action={() => onToolChange(item.tool)}
        />
      ))}

      <Divider />

      {SLIDE_DRAWING_COLORS.map((item) => {
        const selected = tool !== 'eraser' && color === item.value;
        return (
          <button
            key={item.value}
            type="button"
            title={item.name}
            aria-label={item.name}
            aria-pressed={selected}
            disabled={tool === 'eraser'}
            onClick={() => onColorChange(item.value)}
            className={cn(
              'inline-flex justify-center items-center rounded-lg p-2 transition-colors',
              'hover:bg-(--vscode-toolbar-hoverBackground)',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vscode-focusBorder)',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            )}
          >
            <span
              className={cn(
                'block w-4 h-4 rounded-full',
                selected &&
                  'ring-2 ring-offset-2 ring-(--color-demo-time-accent) ring-offset-(--vscode-editorWidget-background)',
              )}
              style={{
                backgroundColor: item.value,
                border: '1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.5))',
              }}
            />
          </button>
        );
      })}

      <Divider />

      <SlideControl
        title="Clear drawings"
        icon={<Trash2 className="w-4 h-4" />}
        disabled={!canClear}
        action={onClear}
      />
      <SlideControl
        title="Stop drawing (Escape)"
        icon={<X className="w-4 h-4" />}
        action={onClose}
      />
    </div>
  );
};
