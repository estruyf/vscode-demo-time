import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { EnhancedSelect, EnhancedSelectContent, EnhancedSelectItem, EnhancedSelectTrigger, EnhancedSelectValue } from "../ui/EnhancedSelect";
import { IDemoTimeSettings } from "@demotime/common";

interface BehaviorSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function BehaviorSettings({ settings, updateSetting }: BehaviorSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Behavior Settings</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Configure demo behavior and file handling</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nextAction">Next Action Behavior</Label>
            <EnhancedSelect
              value={settings.nextActionBehaviour}
              onValueChange={(value: string) => updateSetting("nextActionBehaviour", value)}
            >
              <EnhancedSelectTrigger>
                <EnhancedSelectValue value={settings.nextActionBehaviour} />
              </EnhancedSelectTrigger>
              <EnhancedSelectContent>
                <EnhancedSelectItem value="lastExecuted">Last Executed</EnhancedSelectItem>
                <EnhancedSelectItem value="currentPosition">Current Position</EnhancedSelectItem>
              </EnhancedSelectContent>
            </EnhancedSelect>
            <p className="text-sm text-gray-600 dark:text-gray-300">Define the behavior of the next action</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
