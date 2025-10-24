import { useEffect } from 'react';
import { ApiData } from '../types/api';

interface UseNotesAutoFetchProps {
  apiData: ApiData | null;
  isMobile: boolean;
  fetchNotes: (notes: string) => void;
  clearNotes: () => void;
}

export const useNotesAutoFetch = ({
  apiData,
  isMobile,
  fetchNotes,
  clearNotes,
}: UseNotesAutoFetchProps) => {
  useEffect(() => {
    if (apiData && !isMobile) {
      // Find the current active step
      const currentStep = apiData.demos
        .flatMap((demo) => demo.children)
        .find((step) => step.isActive);

      if (currentStep?.notes) {
        fetchNotes(currentStep.notes);
      } else {
        // Clear notes if no current step has notes
        clearNotes();
      }
    } else if (isMobile) {
      // Clear notes on mobile
      clearNotes();
    }
  }, [apiData, isMobile, fetchNotes, clearNotes]);
};
