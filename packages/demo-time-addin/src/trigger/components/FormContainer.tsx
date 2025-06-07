import * as React from 'react';
import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Button } from './Button';
import { FormField } from './FormField';
import { StatusMessage } from './StatusMessage';
import { useStatusMessage } from '../hooks/useStatusMessage';
import { DemoTimeService } from '../services/DemoTimeService';

export const FormContainer: React.FC = () => {
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:3710');
  const [commandId, setCommandId] = useState<string>('');
  const [slideId, setSlideId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const [crntTimeout, setCrntTimeout] = useState<number | null>(null);
  const [executed, setExecuted] = useState<boolean>(false);
  const { statusMessage, showStatus } = useStatusMessage();

  const validateSlide = React.useCallback(async () => {
    const isInPresentationMode = await DemoTimeService.checkPresentationMode();
    if (!isInPresentationMode) {
      clearTimeout(crntTimeout);
      setCrntTimeout(null);
      setExecuted(false);
      return;
    }

    if (crntTimeout) {
      clearTimeout(crntTimeout);
    }

    const timeout = window.setTimeout(async () => {
      const crntSlide = await DemoTimeService.getCurrentSlideIndex();
      if (crntSlide === -1) {
        showStatus("No slide selected or in edit mode", "error");
        setExecuted(false);
        return;
      }

      setCurrentSlide(crntSlide);

      // Reset executed flag if we're on a different slide
      if (crntSlide !== slideId) {
        setExecuted(false);
      }

      showStatus(`Current slide changed to ${crntSlide} and ${slideId}`, "info");

      // Only run the command if we're on the target slide and it hasn't been executed yet
      if (slideId !== null && slideId === crntSlide && !executed) {
        try {
          // await DemoTimeService.runCommand(serverUrl, commandId);
          setExecuted(true);
          showStatus(`Command executed for slide ${slideId}`, "success");
        } catch (err) {
          console.error("Error executing command:", err);
          showStatus("Failed to execute command", "error");
        }
      }

      validateSlide();
    }, 500);

    setCrntTimeout(timeout);
  }, [crntTimeout, slideId, serverUrl, commandId, executed, showStatus]);

  const loadSettings = () => {
    // Load saved settings
    const settings = DemoTimeService.loadSettings();
    setServerUrl(settings.serverUrl);
    setCommandId(settings.commandId);
    setSlideId(settings.slideId);
    setExecuted(false); // Reset executed flag when loading settings
  };

  // Handler for ActiveViewChanged event
  const startPresentationModeHandler = React.useCallback(async () => {
    const isInPresentationMode = await DemoTimeService.checkPresentationMode();
    if (isInPresentationMode) {
      setExecuted(false);
      validateSlide();
    } else {
      if (crntTimeout) {
        clearTimeout(crntTimeout);
        setCrntTimeout(null);
      }
      setExecuted(false);
      Office.context.document.removeHandlerAsync(
        Office.EventType.ActiveViewChanged,
        startPresentationModeHandler,
      );
    }
  }, [crntTimeout, validateSlide, setExecuted]);

  const addActiveViewChangedHandler = React.useCallback(() => {
    Office.context.document.removeHandlerAsync(
      Office.EventType.ActiveViewChanged,
      startPresentationModeHandler,
    );

    if (executed || !slideId) {
      return;
    }

    try {
      if (Office.context.document) {
        // @ts-ignore - The event might not be properly typed
        Office.context.document.addHandlerAsync(
          Office.EventType.ActiveViewChanged,
          startPresentationModeHandler,
        );
      }
    } catch (err) {
      console.error("Failed to add view change handler:", err);
    }
  }, [crntTimeout, slideId, executed]);

  useEffect(() => {
    addActiveViewChangedHandler();
  }, [slideId, executed]);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleRunCommand = async () => {
    // Only proceed if we have a command ID
    if (!commandId) {
      showStatus("Please enter a command ID", "error");
      return;
    }

    // Show loading message
    showStatus("Sending command...", "");

    try {
      const response = await DemoTimeService.runCommand(serverUrl, commandId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      // Success message
      showStatus("Command executed successfully!", "success");
    } catch (err: any) {
      console.error("Demo Time trigger failed", err);
      showStatus(`Error: ${err.message || "Failed to execute command"}`, "error");
    }
  };

  const handleSaveSettings = async () => {
    const slideIndex = await DemoTimeService.getCurrentSlideIndex();
    DemoTimeService.saveSettings(serverUrl, commandId, slideIndex);
    loadSettings();
    setExecuted(false);
    showStatus("Settings saved successfully!", "success");
  };

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
        <div className="flex-1 text-left text-sm text-gray-600">
          {slideId ? (
            <>
              Current Slide ID: <span className="font-mono">{slideId}</span>
              {currentSlide && currentSlide !== slideId && (
                <>
                  {" | "}Active Slide: <span className="font-mono">{currentSlide}</span>
                </>
              )}
            </>
          ) : (
            <>No slide selected</>
          )}
        </div>
        <Button
          id="testBtn"
          onClick={handleRunCommand}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Test
        </Button>

        <Button
          id="saveBtn"
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save
        </Button>
      </div>

      <StatusMessage {...statusMessage} />
    </div>
  );
};
