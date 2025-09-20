import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Plus, Trash2 } from "lucide-react";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";
import { PathInput } from "../ui/PathInput";
import { useCallback, useState } from "react";

interface UICustomizationSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function UICustomizationSettings({ settings, updateSetting }: UICustomizationSettingsProps) {
  const [newComponent, setNewComponent] = useState("");

  const addCustomComponent = useCallback(() => {
    if (
      newComponent &&
      !settings.customWebComponents.includes(newComponent)
    ) {
      updateSetting("customWebComponents", [...settings.customWebComponents, newComponent]);
      setNewComponent("");
    } else {
      setNewComponent("");
    }
  }, [newComponent, settings.customWebComponents, updateSetting]);

  const removeCustomComponent = (index: number) => {
    if (settings) {
      updateSetting(
        "customWebComponents",
        settings.customWebComponents.filter((_, i) => i !== index),
      )
    }
  }

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">UI & Customization</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Customize the interface and add custom components</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customTheme">Custom Theme Path</Label>
            <PathInput
              value={settings.customTheme}
              placeholder="Path to CSS file"
              type="file"
              fileTypes={[".css"]}
              onChange={(value) => updateSetting("customTheme", value)}
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">Path to a CSS file for custom theming</p>
          </div>

          <div className="space-y-2">
            <Label>Custom Web Components</Label>
            <div className="space-y-2">
              {settings.customWebComponents.map((component, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={component}
                    disabled
                    placeholder="Enter javascript file path"
                    onChange={() => { }}
                  />
                  <Button className="shrink-0" variant="secondary" onClick={() => removeCustomComponent(index)} icon={Trash2} size="sm">
                    {""}
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 w-full">
                <PathInput
                  value={newComponent}
                  placeholder="Path to JavaScript file"
                  type="file"
                  fileTypes={[".js", ".cjs", ".mjs"]}
                  onChange={(value) => setNewComponent(value)}
                />
                <Button className="shrink-0" onClick={addCustomComponent} icon={Plus} size="sm" disabled={!newComponent}>
                  {""}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Paths to JavaScript files for custom web components</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
