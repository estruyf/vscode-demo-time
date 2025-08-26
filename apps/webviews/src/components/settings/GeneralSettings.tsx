import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/EnhancedSelect";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";

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
      </div>
    </Card>
  );
}
