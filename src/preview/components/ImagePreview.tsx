import * as React from 'react';

export interface IImagePreviewProps {
  fileUri: string;
}

export const ImagePreview: React.FunctionComponent<IImagePreviewProps> = ({
  fileUri
}: React.PropsWithChildren<IImagePreviewProps>) => {
  return (
    <div className='preview_view h-full w-full relative'>
      <img src={fileUri} className='absolute inset-0 h-full w-full object-contain object-center' />
    </div>
  );
};