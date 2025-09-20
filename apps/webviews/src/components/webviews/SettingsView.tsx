import { useEffect, useState, useMemo } from "react"
import { Button } from "../ui/Button"
import { Save, RotateCcw } from "lucide-react"
import { Loader as Spinner } from "vscrui";
import { messageHandler } from "@estruyf/vscode/dist/client"
import GeneralSettings from "../settings/GeneralSettings"
import PresentationControls from "../settings/PresentationControls"
import HighlightingSettings from "../settings/HighlightingSettings"
import TypingAnimationSettings from "../settings/TypingAnimationSettings"
import APISettings from "../settings/APISettings"
import UICustomizationSettings from "../settings/UICustomizationSettings"
import BehaviorSettings from "../settings/BehaviorSettings"
import TemplatesSettings from "../settings/TemplatesSettings"
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings"
import { AppHeader } from "../layout/AppHeader";
import { WebViewMessages } from "@demotime/common";
import '../../styles/config.css';

const SettingsView = () => {
  const [settings, setSettings] = useState<IDemoTimeSettings | undefined>(undefined);
  const [originalSettings, setOriginalSettings] = useState<IDemoTimeSettings | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<{ type: "blank" | "dirty" | "success" | "error", text: string }>({ type: "blank", text: "" });
  const [saveLoading, setSaveLoading] = useState(false);

  const getSettings = () => {
    messageHandler.request<IDemoTimeSettings>(WebViewMessages.toVscode.settingsView.getSettings).then((response: IDemoTimeSettings) => {
      setSettings(response);
      setOriginalSettings(response);
    }).catch((error: Error) => {
      console.error("Error loading settings:", error.message);
      setSettings(undefined);
      setOriginalSettings(undefined);
    });
  }

  const updateSetting = (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings] | undefined) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  const resetToDefaults = () => {
    getSettings();
  }

  const saveSettings = () => {
    if (!settings || !originalSettings) return;
    setSaveLoading(true);
    const changed: Partial<IDemoTimeSettings> = {};
    for (const key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        // @ts-expect-error: Dynamic key access for settings diff
        if (settings[key] !== originalSettings[key]) {
          // @ts-expect-error: Dynamic key assignment for changed settings
          changed[key] = settings[key];
        }
      }
    }
    messageHandler.request(WebViewMessages.toVscode.settingsView.saveSettings, changed).then((value: unknown) => {
      setSaveLoading(false);
      if (typeof value === "boolean" && value) {
        setOriginalSettings(settings);
        setSaveStatus({ type: "success", text: "Saved settings" });
      } else {
        setSaveStatus({ type: "error", text: "Something went wrong" });
      }
    }).catch((error: Error) => {
      setSaveLoading(false);
      setSaveStatus({ type: "error", text: "Something went wrong" });
      console.error("Error saving settings:", error.message);
    });
  }

  const isDirty = useMemo(() => {
    if (!settings || !originalSettings) return false;
    for (const key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        // @ts-expect-error: Dynamic key access for settings diff
        if (settings[key] !== originalSettings[key]) {
          return true;
        }
      }
    }
    return false;
  }, [settings, originalSettings]);

  // Show 'Unsaved changes' only when dirty
  useEffect(() => {
    if (isDirty) {
      setSaveStatus((prev) => prev.type === "dirty" ? prev : { type: "dirty", text: "Unsaved changes" });
    } else if (saveStatus.type === "dirty") {
      setSaveStatus({ type: "blank", text: "" });
    }
  }, [isDirty, saveStatus.type]);

  useEffect(() => {
    getSettings();
    setSaveStatus({ type: "blank", text: "" });
  }, []);

  if (!settings) {
    return <Spinner />;
  }

  return (
    <>
      {saveLoading && (
        <Spinner />
      )}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader
          title="Settings Editor"
          subtitle="Manage the Demo Time settings"
          showValidation={false}
          onToggleValidation={() => { }}
          fileControls={null}
          actionControls={
            <div className="flex items-center gap-4">
              {saveStatus.type !== "blank" && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${saveStatus.type === "success"
                    ? "bg-green-500"
                    : saveStatus.type === "error"
                      ? "bg-red-500"
                      : saveStatus.type === "dirty"
                        ? "bg-yellow-800 animate-pulse"
                        : "bg-gray-400"
                    }`} />
                  <span className={`text-xs ${saveStatus.type === "success"
                    ? "text-green-500"
                    : saveStatus.type === "error"
                      ? "text-red-500"
                      : saveStatus.type === "dirty"
                        ? "text-yellow-900"
                        : "text-gray-400"
                    }`}>
                    {saveStatus.text}
                  </span>
                </div>
              )}
              <Button variant="secondary" onClick={resetToDefaults} icon={RotateCcw}>
                Reset
              </Button>
              <Button
                variant="dark"
                onClick={saveSettings}
                icon={Save}
                disabled={!isDirty}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
                size="sm"
              >
                Save
              </Button>
            </div>
          }
          autoSaveStatus={undefined}
        />

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* General Settings */}
          <GeneralSettings settings={settings} updateSetting={updateSetting} />

          {/* Presentation Controls */}
          <PresentationControls settings={settings} updateSetting={updateSetting} />

          {/* Highlighting Settings */}
          <HighlightingSettings settings={settings} updateSetting={updateSetting} />

          {/* Typing Animation */}
          <TypingAnimationSettings settings={settings} updateSetting={updateSetting} />

          {/* API Settings */}
          <APISettings settings={settings} updateSetting={updateSetting} />

          {/* UI & Customization */}
          <UICustomizationSettings
            settings={settings}
            updateSetting={updateSetting}
          />

          {/* Behavior Settings */}
          <BehaviorSettings settings={settings} updateSetting={updateSetting} />

          {/* Templates */}
          <TemplatesSettings settings={settings} updateSetting={updateSetting} />
        </div>
      </div>
    </>
  )
}

export default SettingsView;