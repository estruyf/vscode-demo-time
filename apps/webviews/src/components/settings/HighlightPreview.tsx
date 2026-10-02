import React from 'react';

interface HighlightPreviewProps {
  borderColor: string;
  background: string;
  opacity: number;
  blur: number;
}

const LINES = [
  "import { greet } from './greet';",
  '',
  'export function welcome(name: string) {',
  '  const message = greet(name);',
  '  return message.toUpperCase();',
  '}',
  '',
  "welcome('Demo Time');",
];

const HIGHLIGHT_START = 2;
const HIGHLIGHT_END = 5;

/**
 * Shows how highlighted code looks with the highlight settings, styled like the editor decorations
 */
export const HighlightPreview: React.FC<HighlightPreviewProps> = ({
  borderColor,
  background,
  opacity,
  blur,
}) => {
  const borderWidth = (index: number) => {
    if (index === HIGHLIGHT_START) {
      return '2px 2px 0 2px';
    }
    if (index === HIGHLIGHT_END) {
      return '0 2px 2px 2px';
    }
    return '0 2px 0 2px';
  };

  return (
    <figure className="m-0">
      <div
        aria-hidden="true"
        className="rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 py-2 text-[13px] leading-[20px]"
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          color: 'var(--vscode-editor-foreground)',
          fontFamily: 'var(--vscode-editor-font-family, monospace)',
        }}
      >
        {LINES.map((line, index) => {
          const isHighlighted = index >= HIGHLIGHT_START && index <= HIGHLIGHT_END;
          return (
            <div key={index} className="flex">
              <span
                className="w-10 shrink-0 pr-3 text-right select-none"
                style={{ color: 'var(--vscode-editorLineNumber-foreground)' }}
              >
                {index + 1}
              </span>
              <span
                className="flex-1 whitespace-pre pl-1"
                style={
                  isHighlighted
                    ? {
                        backgroundColor: background || 'var(--vscode-editor-selectionBackground)',
                        borderColor: borderColor || 'rgba(255, 0, 0, 0.5)',
                        borderStyle: 'solid',
                        borderWidth: borderWidth(index),
                      }
                    : {
                        // Like the editor, 0 falls back to 1
                        opacity: Math.max(0, Math.min(1, opacity || 1)),
                        filter: `blur(${Math.max(0, blur)}px)`,
                      }
                }
              >
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Preview with the colors of your current theme.
      </figcaption>
    </figure>
  );
};
