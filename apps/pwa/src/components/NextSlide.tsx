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
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    // Load collapsed state from localStorage, default to false (expanded)
    const stored = localStorage.getItem('nextSlideCollapsed');
    return stored ? JSON.parse(stored) : false;
  });
  const divRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('nextSlideCollapsed', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

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

  React.useEffect(() => {
    // Store the collapsed state in localStorage whenever it changes
    localStorage.setItem('nextSlideCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Refresh iframe when nextTitle changes
  React.useEffect(() => {
    if (iframeRef.current && nextTitle) {
      const iframe = iframeRef.current;
      const currentSrc = iframe.src;
      const url = new URL(currentSrc);
      url.searchParams.set('t', Date.now().toString());
      iframe.src = url.toString();
    }
  }, [nextTitle]);

  if (!hasNext || !connectionStatus.connected) {
    return null;
  }

  return (
    <div className="bg-[#1a1f2e] border-l border-gray-700/30 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-700/30 flex items-center gap-2 mr-[85px]">
        <button
          onClick={toggleCollapsed}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-white">
          {
            nextTitle ? `Next: ${nextTitle}` : 'Next Slide'
          }
        </h3>
      </div>

      {!isCollapsed && (
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
      )}
    </div>
  );
};
