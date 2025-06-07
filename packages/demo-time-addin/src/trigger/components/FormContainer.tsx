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
  const [slideId, setSlideId] = useState<string>('');
  const { statusMessage, showStatus } = useStatusMessage();

  useEffect(() => {
    const validateSlide = () => {
      Office.context.document.getSelectedDataAsync<{ slides?: any[] }>(
        Office.CoercionType.SlideRange,
        (slideResult) => {
          if (
            slideResult.status === Office.AsyncResultStatus.Succeeded &&
            slideResult.value &&
            slideResult.value.slides &&
            slideResult.value.slides.length > 0
          ) {
            const currentSlide = slideResult.value.slides[0];
            const slideIndex = currentSlide.index;
            if (typeof slideIndex === 'number' && slideId !== slideIndex.toString()) {
              setSlideId(slideIndex.toString());
            }
          } else if (slideId !== '') {
            setSlideId('');
          }
        }
      );
    };

    const interval = setInterval(validateSlide, 500);
    return () => clearInterval(interval);
  }, [slideId]);

  const loadSettings = () => {
    // Load saved settings
    const settings = DemoTimeService.loadSettings();
    setServerUrl(settings.serverUrl);
    setCommandId(settings.commandId);
    setSlideId(settings.slideId);
  };

  // Handler for ActiveViewChanged event
  const startPresentationModeHandler = async () => {
    const isInPresentationMode = await DemoTimeService.checkPresentationMode();
    if (isInPresentationMode) {
      showStatus("Presentation mode started", "info");
    } else {
      showStatus("Presentation mode not started", "warning");
    }
  };

  const addActiveViewChangedHandler = () => {
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
  };

  useEffect(() => {
    loadSettings();

    addActiveViewChangedHandler();
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

  const handleSaveSettings = () => {
    Office.context.document.getSelectedDataAsync<{ slides?: any[] }>(
      Office.CoercionType.SlideRange,
      (slideResult) => {
        if (
          slideResult.status === Office.AsyncResultStatus.Succeeded &&
          slideResult.value &&  // Verify we have slide data
          slideResult.value.slides &&
          slideResult.value.slides.length > 0
        ) {
          // Extract slide information
          const slidesValue = slideResult.value;
          const currentSlide = slidesValue.slides[0];
          const slideIndex = currentSlide.index;

          if (typeof slideIndex === 'number') {
            DemoTimeService.saveSettings(serverUrl, commandId, slideIndex.toString());
            loadSettings();
            showStatus("Settings saved successfully!", "success");
          }
        } else {
          showStatus("No slide selected or failed to retrieve slide data", "error");
        }
      }
    );
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
            <>Current Slide ID: <span className="font-mono">{slideId}</span></>
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
