import * as React from 'react';
import { Icon } from 'vscrui';

export interface ISlideNotesEditorProps {
  slideNr: number;
  notes?: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}

export const SlideNotesEditor: React.FunctionComponent<ISlideNotesEditorProps> = ({
  slideNr,
  notes,
  onSave,
  onClose,
}) => {
  const [value, setValue] = React.useState(notes || '');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isMac = React.useMemo(() => navigator.platform.toUpperCase().includes('MAC'), []);

  const save = React.useCallback(() => {
    onSave(value);
  }, [onSave, value]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, []);

  // ESC to close (capture phase to intercept before presentation close)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const onTextareaKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    },
    [save],
  );

  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-notes-editor-title"
        className="w-[90%] max-w-[720px] max-h-[80vh] rounded-md overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--vscode-editorWidget-background)',
          border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
          boxShadow: '0 8px 32px var(--vscode-widget-shadow)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            borderBottom:
              '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
          }}
        >
          <span
            id="slide-notes-editor-title"
            className="text-sm font-medium text-(--vscode-editorWidget-foreground)"
          >
            Speaker notes: slide {slideNr}
          </span>
          <button
            onClick={onClose}
            className="text-(--vscode-editorWidget-foreground) hover:bg-(--vscode-toolbar-hoverBackground) rounded-xs p-1 cursor-pointer"
            title="Close"
          >
            <Icon name={'close' as never} className="inline-flex justify-center items-center" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2 min-h-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            rows={12}
            placeholder="What do you want to say on this slide? Markdown is supported."
            aria-label="Speaker notes"
            className="w-full min-h-0 resize-y rounded-xs px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-(--vscode-focusBorder)"
            style={{
              fontFamily: 'var(--vscode-editor-font-family)',
              color: 'var(--vscode-input-foreground)',
              backgroundColor: 'var(--vscode-input-background)',
              border: '1px solid var(--vscode-input-border, transparent)',
            }}
          />
          <p className="text-xs text-(--vscode-descriptionForeground)">
            Saved in a <code>{'<!-- notes -->'}</code> block of the slide. Leave empty to remove the
            notes.
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
          style={{
            borderTop: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border))',
          }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-xs text-sm cursor-pointer text-(--vscode-button-secondaryForeground) bg-(--vscode-button-secondaryBackground) hover:bg-(--vscode-button-secondaryHoverBackground)"
          >
            Cancel
          </button>
          <button
            onClick={save}
            title={`Save (${isMac ? '⌘' : 'Ctrl'}+Enter)`}
            className="px-3 py-1 rounded-xs text-sm cursor-pointer text-(--vscode-button-foreground) bg-(--vscode-button-background) hover:bg-(--vscode-button-hoverBackground)"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
