import { useMemo } from 'react';
import { ApiData } from '../types/api';

export const useSplitView = (apiData: ApiData | null | undefined, isMobile: boolean) => {
  const splitView = useMemo(() => {
    return !isMobile && Boolean(apiData?.settings?.showScreenshot || apiData?.settings?.showNotes);
  }, [isMobile, apiData?.settings?.showScreenshot, apiData?.settings?.showNotes]);

  return { splitView };
};
