import { useEffect } from 'react';
import { ApiData } from '../types/api';

interface UseNotesAutoFetchProps {
  apiData: ApiData | null;
  isMobile: boolean;
  fetchNotes: (notes: string) => void;
  clearNotes: () => void;
  showNotes: (notes: string) => void;
}

export const useNotesAutoFetch = ({
  apiData,
  isMobile,
  fetchNotes,
  clearNotes,
  showNotes,
}: UseNotesAutoFetchProps) => {
  useEffect(() => {
    if (apiData && !isMobile) {
      // The notes of the current slide come before the notes of the scene
      if (apiData.slides?.notes) {
        showNotes(apiData.slides.notes);
        return;
      }

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
  }, [apiData, isMobile, fetchNotes, clearNotes, showNotes]);
};
