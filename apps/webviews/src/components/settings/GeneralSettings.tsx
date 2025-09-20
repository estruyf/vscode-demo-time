import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/EnhancedSelect";
import { IDemoTimeSettings } from "@demotime/common";
import { useState } from "react";
import { Icon } from "vscrui";

interface GeneralSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function GeneralSettings({ settings, updateSetting }: GeneralSettingsProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">General</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Core configuration settings</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileType">Default File Type</Label>
            <Select
              value={settings.defaultFileType}
              onValueChange={(value: string) => updateSetting("defaultFileType", value as string)}
            >
              <SelectTrigger>
                <SelectValue value={settings.defaultFileType.toUpperCase()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="yaml">YAML</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Default format for new demo files - this is the most important setting
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-8">
          <Label htmlFor="engageTimeApiKey">Engage Time API Key</Label>
          <div className="relative">
            <input
              id="engageTimeApiKey"
              type={showApiKey ? 'text' : 'password'}
              value={settings.engageTimeApiKey || ''}
              onChange={e => updateSetting('engageTimeApiKey', e.target.value)}
              className="w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Engage Time API key"
              autoComplete="off"
            />
            <button
              type="button"
              aria-pressed={showApiKey}
              onClick={() => setShowApiKey(v => !v)}
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? (
                <Icon name="eye-closed" className="text-xl h-full !flex !items-center" />
              ) : (
                <Icon name="eye" className="text-xl h-full !flex !items-center" />
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Used for integrating with Engage Time services. Your API key is stored securely and never shared.
          </p>
          <p className="text-sm mt-2">
            <a
              href="https://engagetime.live/speaker/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500 hover:text-blue-700"
            >
              Manage your API key in Engage Time API Management
            </a>
          </p>
        </div>
      </div>
    </Card>
  );
}
