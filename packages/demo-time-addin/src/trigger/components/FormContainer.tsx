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
  const { statusMessage, showStatus } = useStatusMessage();

  useEffect(() => {
    // Load saved settings
    const settings = DemoTimeService.loadSettings();
    setServerUrl(settings.serverUrl);
    setCommandId(settings.commandId);
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
    DemoTimeService.saveSettings(serverUrl, commandId, "");

    // Uncomment if you want to handle PowerPoint slide ID saving
    // if (Office?.context?.document) {
    //   Office.context.document.getSelectedDataAsync(
    //     Office.CoercionType.SlideRange,
    //     (slideResult) => {
    //       if (
    //         slideResult.status === Office.AsyncResultStatus.Succeeded &&
    //         slideResult.value &&
    //         slideResult.value.slides &&
    //         slideResult.value.slides.length > 0
    //       ) {
    //         // Extract slide information
    //         const currentSlide = slideResult.value.slides[0];
    //         const slideIndex = currentSlide.index;
    //         localStorage.setItem("dtAddInSlideId", slideIndex.toString());
    //       }
    //     }
    //   );
    // }

    console.log("Settings saved");
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

      <div className="flex gap-2 mt-4 justify-end">
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
