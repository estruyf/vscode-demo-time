import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/EnhancedSelect";
import { IDemoTimeSettings } from "@demotime/common";

interface GeneralSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function GeneralSettings({ settings, updateSetting }: GeneralSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-demo-time-white mb-2">General</h2>
        <p className="text-demo-time-gray-4 mb-6">Core configuration settings</p>

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
            <p className="text-sm text-demo-time-gray-4">
              Default format for new demo files - this is the most important setting
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-8">
          <Label htmlFor="engageTimeApiKey">Engage Time API Key</Label>
          <input
            id="engageTimeApiKey"
            type="text"
            value={settings.engageTimeApiKey || ''}
            onChange={e => updateSetting('engageTimeApiKey', e.target.value)}
            className="w-full px-3 py-2 border border-demo-time-gray-3 rounded-md bg-demo-time-black text-demo-time-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Engage Time API key"
            autoComplete="off"
          />
          <p className="text-sm text-demo-time-gray-4">
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
