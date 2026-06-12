import { useMemo } from 'react';
import { ApiData } from '../types/api';

export const useSplitView = (apiData: ApiData | null | undefined, isMobile: boolean) => {
  const splitView = useMemo(() => {
    if (!apiData || !apiData.settings) {
      return false;
    }
    return (
      !isMobile && (apiData.settings.showScreenshot === true || apiData.settings.showNotes === true)
    );
  }, [isMobile, apiData?.settings?.showScreenshot, apiData?.settings?.showNotes]);

  return { splitView };
};
