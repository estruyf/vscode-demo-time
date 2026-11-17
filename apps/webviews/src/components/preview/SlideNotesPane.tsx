import * as React from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';

export interface ISlideNotesPaneProps {
  /**
   * The notes from the `<!-- notes -->` blocks of the slide
   */
  notes?: string;
  /**
   * The workspace relative path of the slide file
   */
  path: string;
  /**
   * The 0-based index of the slide in its file
   */
  slideIndex: number;
  /**
   * The 1-based number of the slide in the preview, which differs from its index in the file
   * for a slide of a file that the file includes with `src`
   */
  slideNumber?: number;
}

interface IPendingNotes {
  path: string;
  slideIndex: number;
  notes: string;
}

// Wait this long after the last key before the notes are saved
const SAVE_DELAY = 1000;
// The height of the pane, changed by dragging its top edge
const HEIGHT_KEY = 'slideNotesHeight';
const MIN_HEIGHT = 48;
const MAX_HEIGHT = 640;
const RESIZE_STEP = 16;

const clampHeight = (height: number) => {
  // Always leave room for the slide
  const max = Math.min(MAX_HEIGHT, Math.max(window.innerHeight * 0.7, MIN_HEIGHT));
  return Math.round(Math.min(Math.max(height, MIN_HEIGHT), max));
};

const getStoredHeight = (): number | undefined => {
  try {
    const stored = Number(localStorage.getItem(HEIGHT_KEY));
    return stored > 0 ? clampHeight(stored) : undefined;
  } catch {
    return undefined;
  }
};

const storeHeight = (height: number | undefined) => {
  try {
    if (height === undefined) {
      localStorage.removeItem(HEIGHT_KEY);
    } else {
      localStorage.setItem(HEIGHT_KEY, String(height));
    }
  } catch {
    // The height is only kept for this session
  }
};

/**
 * The speaker notes of the current slide below the slide preview. What you type is saved in the
 * `<!-- notes -->` block of the slide.
 */
export const SlideNotesPane: React.FunctionComponent<ISlideNotesPaneProps> = ({
  notes,
  path,
  slideIndex,
  slideNumber,
}) => {
  const paneRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState(notes || '');
  // Without a height of its own, the pane follows the height of the preview
  const [height, setHeight] = React.useState<number | undefined>(getStoredHeight);
  const [isResizing, setIsResizing] = React.useState(false);
  const pendingRef = React.useRef<IPendingNotes | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();
  const isFocusedRef = React.useRef(false);
  const slideKey = `${path}#${slideIndex}`;
  const slideKeyRef = React.useRef(slideKey);

  // Saves the notes that are not saved yet, to the slide they were typed for
  const flush = React.useCallback(() => {
    clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      messageHandler.send(WebViewMessages.toVscode.preview.setSlideNotes, pending);
    }
  }, []);

  React.useEffect(() => {
    if (slideKeyRef.current !== slideKey) {
      slideKeyRef.current = slideKey;
      flush();
      setValue(notes || '');
    } else if (!isFocusedRef.current && !pendingRef.current) {
      // The file changed. While you type, the saved notes don't replace what you typed since.
      setValue(notes || '');
    }
  }, [slideKey, notes, flush]);

  // Don't lose the last change when the pane closes
  React.useEffect(() => flush, [flush]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    pendingRef.current = { path, slideIndex, notes: newValue };
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DELAY);
  };

  const onFocus = () => {
    isFocusedRef.current = true;
  };

  const onBlur = () => {
    isFocusedRef.current = false;
    if (pendingRef.current) {
      flush();
    } else {
      setValue(notes || '');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // The keys are for the notes, not for the slide or the presentation view
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      textareaRef.current?.blur();
    }
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !paneRef.current) {
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startHeight = paneRef.current.getBoundingClientRect().height;
    const handle = e.currentTarget;
    setIsResizing(true);

    const onMove = (event: PointerEvent) => {
      setHeight(clampHeight(startHeight + startY - event.clientY));
    };
    const onEnd = (event: PointerEvent) => {
      handle.releasePointerCapture(event.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      setIsResizing(false);
      setHeight((crntHeight) => {
        storeHeight(crntHeight);
        return crntHeight;
      });
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  };

  const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const crntHeight = height ?? paneRef.current?.getBoundingClientRect().height ?? MIN_HEIGHT;
    const next = clampHeight(crntHeight + (e.key === 'ArrowUp' ? RESIZE_STEP : -RESIZE_STEP));
    setHeight(next);
    storeHeight(next);
  };

  // A double-click on the edge goes back to the default height
  const resetHeight = () => {
    setHeight(undefined);
    storeHeight(undefined);
  };

  return (
    <div
      ref={paneRef}
      data-slide-notes
      className={`relative shrink-0 w-full ${
        height === undefined ? 'h-[clamp(72px,20vh,160px)]' : ''
      } ${isResizing ? 'select-none' : ''}`}
      style={height === undefined ? undefined : { height }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="Click to add speaker notes. Markdown is supported."
        aria-label={`Speaker notes of slide ${slideNumber ?? slideIndex + 1}`}
        spellCheck
        className="block w-full h-full resize-none px-4 py-3 text-sm leading-relaxed focus:outline-none placeholder:text-(--vscode-input-placeholderForeground)"
        style={{
          fontFamily: 'var(--vscode-editor-font-family)',
          color: 'var(--vscode-editor-foreground)',
          backgroundColor: 'var(--vscode-sideBar-background, var(--vscode-editor-background))',
          borderTop: '1px solid var(--vscode-sideBar-border, var(--vscode-widget-border))',
        }}
      />
      <div
        role="separator"
        aria-label="Resize speaker notes"
        aria-orientation="horizontal"
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
        aria-valuenow={height}
        title="Drag to resize, double-click to reset"
        tabIndex={0}
        className={`absolute -top-0.5 left-0 z-20 w-full h-1 cursor-row-resize transition-colors hover:bg-(--vscode-focusBorder) focus-visible:outline-none focus-visible:bg-(--vscode-focusBorder) ${
          isResizing ? 'bg-(--vscode-focusBorder)' : ''
        }`}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={resetHeight}
      />
    </div>
  );
};
