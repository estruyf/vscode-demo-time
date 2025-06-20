import * as React from 'react';
import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Button } from './Button';
import { FormField } from './FormField';
import { StatusMessage } from './StatusMessage';
import { useStatusMessage } from '../hooks/useStatusMessage';
import { DemoTimeService } from '../services/DemoTimeService';
import { ExecutionTrackingService } from '../services/ExecutionTrackingService';
import { useVisibility } from '../hooks/useVisibility';

export const FormContainer: React.FC = () => {
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3710');
  const [demoId, setDemoId] = useState<string>('');
  const [slideId, setSlideId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const [crntTimeout, setCrntTimeout] = useState<number | null>(null);
  const { statusMessage, showStatus } = useStatusMessage();
  const isVisible = useVisibility();

  // Force re-render when execution status changes
  const [, forceRender] = useState({});

  const validateSlide = React.useCallback(async () => {
    const isInPresentationMode = await DemoTimeService.checkPresentationMode();
    if (!isInPresentationMode) {
      if (crntTimeout) {
        clearTimeout(crntTimeout);
        setCrntTimeout(null);
      }
      ExecutionTrackingService.resetExecution(slideId);
      forceRender({});
      return;
    }

    // Always clear any existing timeout before setting a new one
    if (crntTimeout) {
      clearTimeout(crntTimeout);
    }

    const crntSlide = await DemoTimeService.getCurrentSlideIndex();
    if (crntSlide === -1) {
      showStatus("No slide selected or in edit mode", "error");
      ExecutionTrackingService.resetExecution(slideId);
      forceRender({});
      return;
    }

    setCurrentSlide(crntSlide);

    // Reset executed flag if we're on a different slide
    if (crntSlide !== slideId) {
      ExecutionTrackingService.resetExecution(slideId);
      forceRender({});
    }

    // Only run the command if we're on the target slide and it hasn't been executed yet
    const isExecuted = ExecutionTrackingService.isCommandExecuted(slideId);
    if (slideId !== null && slideId >= 0 && slideId === crntSlide && !isExecuted) {
      try {
        await DemoTimeService.runCommand(serverUrl, demoId);
        console.log(`Executing command for slide ${slideId}, executed was: ${isExecuted}`);
        ExecutionTrackingService.markCommandExecuted(slideId);
        forceRender({});
        // Use the previous state pattern to get the latest executed value in the status message
        showStatus(`Command executed for slide`, "success");
      } catch (err) {
        console.error("Error executing command:", err);
        showStatus("Failed to execute command", "error");
      }
    }

    // Set a new timeout for the next check, but store the ID so we can cancel it if needed
    const newTimeout = window.setTimeout(() => {
      validateSlide();
    }, 500);

    setCrntTimeout(newTimeout);
  }, [crntTimeout, slideId, serverUrl, demoId, showStatus]);

  const loadSettings = () => {
    // Load saved settings
    const settings = DemoTimeService.loadSettings();
    setServerUrl(settings.serverUrl);
    setDemoId(settings.demoId);
    setSlideId(settings.slideId);
    ExecutionTrackingService.resetExecution(settings.slideId);
    forceRender({});
  };

  // Handler for ActiveViewChanged event
  const startPresentationModeHandler = React.useCallback(async () => {
    const isInPresentationMode = await DemoTimeService.checkPresentationMode();
    if (isInPresentationMode) {
      ExecutionTrackingService.resetExecution(slideId);
      forceRender({});
      validateSlide();
    } else {
      if (crntTimeout) {
        clearTimeout(crntTimeout);
        setCrntTimeout(null);
      }
      ExecutionTrackingService.resetExecution(slideId);
      forceRender({});
    }
  }, [crntTimeout, validateSlide]);

  const addActiveViewChangedHandler = React.useCallback(() => {
    if (ExecutionTrackingService.isCommandExecuted(slideId) || typeof slideId !== 'number' || slideId === null || slideId < 0) {
      return;
    }

    try {
      if (Office.context.document) {
        Office.context.document.addHandlerAsync(
          Office.EventType.ActiveViewChanged,
          startPresentationModeHandler,
        );
      }
    } catch (err) {
      console.error("Failed to add view change handler:", err);
    }
  }, [slideId]);

  const handleRunCommand = async () => {
    // Only proceed if we have a demo ID
    if (!demoId) {
      showStatus("Please enter a demo ID", "error");
      return;
    }

    try {
      await DemoTimeService.runCommand(serverUrl, demoId);
      // Success message
      showStatus("Command executed successfully!", "success");
    } catch (err) {
      console.error("Demo Time trigger failed", err);
      showStatus(`Error: ${(err as Error).message || "Failed to execute command"}`, "error");
    }
  };

  const handleSaveSettings = async () => {
    const slideIndex = await DemoTimeService.getCurrentSlideIndex();
    if (slideIndex !== null) {
      DemoTimeService.saveSettings(serverUrl, demoId, slideIndex);
      loadSettings();
      ExecutionTrackingService.resetExecution(slideIndex);
      showStatus("Settings saved successfully!", "success");
    } else {
      showStatus("No slide selected to save settings.", "error");
    }
  };

  useEffect(() => {
    if (!slideId || ExecutionTrackingService.isCommandExecuted(slideId)) {
      Office.context.document.removeHandlerAsync(
        Office.EventType.ActiveViewChanged,
        startPresentationModeHandler,
      );
      return;
    }
    addActiveViewChangedHandler();
  }, [slideId]);

  useEffect(() => {
    if (isVisible) {
      console.log("FormContainer is visible, starting validation");
      // If not in presentation mode, get the current slide id
      DemoTimeService.checkPresentationMode().then(isInPresentationMode => {
        if (!isInPresentationMode) {
          DemoTimeService.getCurrentSlideIndex().then(slideIndex => {
            setCurrentSlide(slideIndex);
          });
        }
      });
    } else {
      console.log("FormContainer is not visible, stopping validation");
    }
  }, [isVisible]);

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div id="formContainer">
      <Header />

      <FormField
        id="serverUrl"
        label="Demo Time - API URL"
        value={serverUrl}
        placeholder="http://localhost:3710"
        onChange={setServerUrl}
      />

      <FormField
        id="demoId"
        label="Demo ID"
        value={demoId}
        onChange={setDemoId}
      />

      <div className="flex gap-2 mt-4 items-center justify-end">
        <div className="flex-1 text-left text-gray-2">
          {slideId && slideId >= 0 ? (
            currentSlide !== null && currentSlide !== slideId ? (
              <>
                <span className="text-yellow-600">Slide order got moved, please save settings.</span>
              </>
            ) : (
              <>
                Saved Slide ID: <span className="font-mono">{slideId}</span>
              </>
            )
          ) : (
            <>Settings not yet saved.</>
          )}
        </div>
        <Button
          id="testBtn"
          onClick={handleRunCommand}
          className="px-2 py-1 text-white rounded cursor-pointer bg-[#6290C8] border border-[#4A7FBF] hover:bg-[#6290C8]/90"
        >
          Test
        </Button>

        <Button
          id="saveBtn"
          onClick={handleSaveSettings}
          className="px-2 py-1 text-black rounded cursor-pointer bg-accent-high border border-accent-high hover:bg-accent-high/90"
        >
          Save
        </Button>
      </div>

      <StatusMessage {...statusMessage} />
    </div>
  );
};