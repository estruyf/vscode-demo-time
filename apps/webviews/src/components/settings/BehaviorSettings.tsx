import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/EnhancedSelect";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";

interface BehaviorSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function BehaviorSettings({ settings, updateSetting }: BehaviorSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-demo-time-white mb-2">Behavior Settings</h2>
        <p className="text-demo-time-gray-4 mb-6">Configure demo behavior and file handling</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nextAction">Next Action Behavior</Label>
            <Select
              value={settings.nextActionBehaviour}
              onValueChange={(value: string) => updateSetting("nextActionBehaviour", value)}
            >
              <SelectTrigger>
                <SelectValue value={settings.nextActionBehaviour} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastExecuted">Last Executed</SelectItem>
                <SelectItem value="currentPosition">Current Position</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-demo-time-gray-4">Define the behavior of the next action</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
