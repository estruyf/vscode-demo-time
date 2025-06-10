import * as React from 'react';
import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Button } from './Button';
import { FormField } from './FormField';
import { StatusMessage } from './StatusMessage';
import { useStatusMessage } from '../hooks/useStatusMessage';
import { DemoTimeService } from '../services/DemoTimeService';
import { ExecutionTrackingService } from '../services/ExecutionTrackingService';

export const FormContainer: React.FC = () => {
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3710');
  const [commandId, setCommandId] = useState<string>('');
  const [slideId, setSlideId] = useState<number | null>(null);
  const [, setCurrentSlide] = useState<number | null>(null);
  const [crntTimeout, setCrntTimeout] = useState<number | null>(null);
  const { statusMessage, showStatus } = useStatusMessage();

  // Force re-render when execution status changes
  const [_, forceRender] = useState({});

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
        await DemoTimeService.runCommand(serverUrl, commandId);
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
  }, [crntTimeout, slideId, serverUrl, commandId, showStatus]);

  const loadSettings = () => {
    // Load saved settings
    const settings = DemoTimeService.loadSettings();
    setServerUrl(settings.serverUrl);
    setCommandId(settings.commandId);
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
  }, [crntTimeout, slideId, validateSlide]);

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
  }, [slideId, startPresentationModeHandler]);

  const handleRunCommand = async () => {
    // Only proceed if we have a command ID
    if (!commandId) {
      showStatus("Please enter a command ID", "error");
      return;
    }

    try {
      await DemoTimeService.runCommand(serverUrl, commandId);
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
      DemoTimeService.saveSettings(serverUrl, commandId, slideIndex);
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
  }, [addActiveViewChangedHandler, slideId, startPresentationModeHandler]);

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div id="formContainer">
      <Header />

      <FormField
        id="serverUrl"
        label="Server URL"
        value={serverUrl}
        placeholder="http://localhost:3710"
        onChange={setServerUrl}
      />

      <FormField
        id="commandId"
        label="Command ID"
        value={commandId}
        onChange={setCommandId}
      />

      <div className="flex gap-2 mt-4 items-center justify-end">
        <div className="flex-1 text-left text-gray-2">
          {slideId && slideId >= 0 ? (
            <>
              Current Slide ID: <span className="font-mono">{slideId}</span>
            </>
          ) : (
            <>Settings not yet saved.</>
          )}
        </div>
        <Button
          id="testBtn"
          onClick={handleRunCommand}
          className="px-2 py-1 text-white rounded cursor-pointer bg-accent border border-accent-low hover:bg-accent/90"
        >
          Test
        </Button>

        <Button
          id="saveBtn"
          onClick={handleSaveSettings}
          className="px-2 py-1 text-white rounded cursor-pointer bg-accent-high border border-accent-high hover:bg-accent-high/90"
        >
          Save
        </Button>
      </div>

      <StatusMessage {...statusMessage} />
    </div>
  );
};
