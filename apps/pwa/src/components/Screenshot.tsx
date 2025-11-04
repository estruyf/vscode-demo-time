import * as React from 'react';
import { useApi } from '../hooks/useApi';

export interface ScreenshotProps {
  nextTitle?: string;
  hasNext?: boolean;
  slideIdx?: number;
}

export const Screenshot: React.FunctionComponent<ScreenshotProps> = ({
  nextTitle,
  hasNext,
  slideIdx,
}) => {
  const { fetchScreenshot } = useApi();
  const [screenshot, setScreenshot] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    const getScreenshot = async () => {
      setLoading(true);
      try {
        const img = await fetchScreenshot();
        setScreenshot(img || undefined);
      } catch (error) {
        console.error('Failed to fetch screenshot:', error);
        setScreenshot(undefined);
      } finally {
        setLoading(false);
      }
    };

    if (hasNext) {
      getScreenshot();
    } else {
      setScreenshot(undefined);
    }
  }, [fetchScreenshot, hasNext, slideIdx]);

  if (loading) {
    return (
      <div className="bg-[#1a1f2e] border-l border-gray-700/30 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700/30">
          <h3 className="text-lg font-semibold text-white">
            {nextTitle ? `Next: ${nextTitle}` : 'Next Slide'}
          </h3>
        </div>
        <div className="flex-grow flex items-center justify-center aspect-video">
          Loading next slide...
        </div>
      </div>
    );
  }

  if (!screenshot) {
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
      <div className="prose prose-invert max-w-none">
        <img src={screenshot} alt="Screenshot" className="max-w-full h-auto" />
      </div>
    </div>
  );
};
