import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { ColorPicker } from "../ui/ColorPicker";
import { IDemoTimeSettings } from "@demotime/common";

interface HighlightingSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function HighlightingSettings({ settings, updateSetting }: HighlightingSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-demo-time-white mb-2">Highlighting Settings</h2>
        <p className="text-demo-time-gray-4 mb-6">Configure code highlighting appearance</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <ColorPicker
                value={settings.highlightBorderColor}
                onChange={(value) => updateSetting("highlightBorderColor", value)}
                label="Border Color"
                placeholder="HEX, RGB/RGBA, or var(--vscode-...)"
                disabled={settings.highlightBorderColor.startsWith("var(")}
              />
              <p className="text-sm text-demo-time-gray-4">
                Color of the border when highlighting a step. Supports HEX (#ff0000 or #ff000080), RGB/RGBA
                (rgb(255,0,0) or rgba(255,0,0,0.5)), or CSS variables (var(--vscode-...))
              </p>
            </div>

            <div className="space-y-2">
              <ColorPicker
                value={settings.highlightBackground}
                onChange={(value) => updateSetting("highlightBackground", value)}
                label="Background Color"
                placeholder="HEX, RGB/RGBA, or var(--vscode-...)"
                disabled={settings.highlightBackground.startsWith("var(")}
              />
              <p className="text-sm text-demo-time-gray-4">
                Color of the border when highlighting a step. Supports HEX (#ff0000 or #ff000080), RGB/RGBA
                (rgb(255,0,0) or rgba(255,0,0,0.5)), or CSS variables (var(--vscode-...))
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blur">Blur Effect</Label>
              <Input
                type="number"
                min={0}
                value={settings.highlightBlur.toString()}
                onChange={(value) => updateSetting("highlightBlur", Number(value))}
              />
              <p className="text-sm text-demo-time-gray-4">Blur effect on non-highlighted text</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opacity">Opacity</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={settings.highlightOpacity.toString()}
                onChange={(value) => updateSetting("highlightOpacity", Math.max(0, Math.min(1, Number(value))))}
              />
              <p className="text-sm text-demo-time-gray-4">Opacity of non-highlighted text</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoom">Zoom Level</Label>
            <Input
              type="number"
              min={0}
              max={10}
              placeholder="Disabled (use 0 or false)"
              value={
                typeof settings.highlightZoomEnabled === "number"
                  ? String(settings.highlightZoomEnabled)
                  : ""
              }
              onChange={(value) => {
                const num = Number(value);
                updateSetting("highlightZoomEnabled", value === "" ? false : isNaN(num) ? false : num);
              }}
            />
            <p className="text-sm text-demo-time-gray-4">
              Enable code zoom when highlighting. Use a number for zoom level, or leave empty to disable.
            </p>
          </div>
        </div>
      </div>
    </Card >
  );
}
