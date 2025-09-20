import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Switch } from "../ui/Switch";
import { Input } from "../ui/Input";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";

interface PresentationControlsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings] | undefined) => void;
}

export default function PresentationControls({ settings, updateSetting }: PresentationControlsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Presentation Controls</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Basic presentation and demo controls</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Previous Command</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enable the previous command when in presentation mode</p>
            </div>
            <Switch
              checked={settings.previousEnabled}
              onCheckedChange={(checked) => updateSetting("previousEnabled", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Clock</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Show a clock in the status bar</p>
            </div>
            <Switch
              checked={settings.showClock}
              onCheckedChange={(checked) => updateSetting("showClock", checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timer">Timer (minutes)</Label>
            <Input
              value={settings.timer?.toString() || ""}
              min={0}
              onChange={(value) => updateSetting("timer", value ? Number(value) : undefined)}
              placeholder="No timer set"
              type="number"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Count down timer for session duration. Leave empty for no timer.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
