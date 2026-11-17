import * as React from 'react';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData } from '@estruyf/vscode';
import { SlideDrawing, SlideDrawingStroke, WebViewMessages } from '@demotime/common';

/**
 * The drawings on the current slide. The extension keeps them, so they are still there when you go
 * back to the slide or the preview opens again, until presentation mode turns on or off.
 *
 * @param key - The slide, from `getSlideDrawingKey`
 */
export const useSlideDrawing = (key: string | undefined) => {
  const [strokes, setStrokes] = React.useState<SlideDrawingStroke[]>([]);
  // Changes since the slide opened, so the drawings of the extension don't replace them
  const changedRef = React.useRef(false);

  React.useEffect(() => {
    setStrokes([]);
    changedRef.current = false;
    if (!key) {
      return;
    }

    let cancelled = false;
    messageHandler
      .request<SlideDrawingStroke[]>(WebViewMessages.toVscode.preview.getSlideDrawing, key)
      .then((value) => {
        if (!cancelled && !changedRef.current && Array.isArray(value)) {
          setStrokes(value);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [key]);

  // The extension removes all drawings when presentation mode turns on or off
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = (message: MessageEvent<EventData<any>>) => {
      if (message.data.command === WebViewMessages.toWebview.updateIsInPresentationMode) {
        changedRef.current = true;
        setStrokes([]);
      }
    };

    Messenger.listen(listener);
    return () => Messenger.unlisten(listener);
  }, []);

  const updateStrokes = React.useCallback(
    (value: SlideDrawingStroke[]) => {
      changedRef.current = true;
      setStrokes(value);
      if (key) {
        const drawing: SlideDrawing = { key, strokes: value };
        messageHandler.send(WebViewMessages.toVscode.preview.saveSlideDrawing, drawing);
      }
    },
    [key],
  );

  const clearStrokes = React.useCallback(() => updateStrokes([]), [updateStrokes]);

  return { strokes, updateStrokes, clearStrokes };
};
