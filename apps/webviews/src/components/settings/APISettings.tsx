import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";

interface APISettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function APISettings({ settings, updateSetting }: APISettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">API Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Configure external API access</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable API</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Allow external control of Demo Time</p>
            </div>
            <Switch
              checked={settings["api.enabled"]}
              onCheckedChange={(checked) => updateSetting("api.enabled", checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiPort">API Port</Label>
            <Input
              type="number"
              value={settings["api.port"].toString()}
              onChange={(value) => updateSetting("api.port", Number(value))}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">Port number for the API server</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
