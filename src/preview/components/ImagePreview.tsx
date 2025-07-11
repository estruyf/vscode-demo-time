import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { WebViewMessages } from '../../constants';

export interface IImagePreviewProps {
  fileUri: string;
}

export const ImagePreview: React.FunctionComponent<IImagePreviewProps> = ({
  fileUri
}: React.PropsWithChildren<IImagePreviewProps>) => {
  React.useEffect(() => {
    // On receiving a fileUri, we send a message to indicate that the slide is ready.
    // This allows to reveal the slide on an update as it waits for the contents to be loaded.
    messageHandler.send(WebViewMessages.toVscode.slideReady);
  }, [fileUri]);

  return (
    <div className='preview_view h-full w-full relative'>
      <img src={fileUri} className='absolute inset-0 h-full w-full object-contain object-center' />
    </div>
  );
};