import * as React from 'react';
import { useApi } from '../hooks/useApi';

export interface INextSlideProps {
  nextTitle?: string;
  hasNext?: boolean;
  slideIdx?: number;
}

export const NextSlide: React.FunctionComponent<INextSlideProps> = ({
  nextTitle,
  hasNext,
  slideIdx
}: React.PropsWithChildren<INextSlideProps>) => {
  const { connectionStatus } = useApi();
  const [scale, setScale] = React.useState(1);
  const divRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const updateScale = () => {
    if (divRef.current) {
      const rect = divRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const scaleWidth = width / 960;
      const scaleHeight = height / 540;
      const newScale = Math.min(scaleWidth, scaleHeight);
      setScale(newScale);
    }
  };

  React.useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [divRef.current, iframeRef]);

  React.useEffect(() => {
    const generate = async () => {
      updateScale();
    };

    if (hasNext) {
      generate();
    }
  }, [hasNext, slideIdx]);

  if (!hasNext || !connectionStatus.connected) {
    return null;
  }

  return (
    <div className="bg-[#1a1f2e] border-l border-gray-700/30 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-700/30">
        <h3 className="text-lg font-semibold text-white">
          {
            nextTitle ? `Next: ${nextTitle}` : 'Next Slide'
          }
        </h3>
      </div>
      <div
        ref={divRef}
        className="aspect-video w-full overflow-hidden relative">
        <iframe
          ref={iframeRef}
          src={`${connectionStatus.url}/preview`}
          className='absolute inset-0 border-0 aspect-video'
          style={{
            width: '960px',
            height: '540px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        ></iframe>
      </div>
    </div>
  );
};
