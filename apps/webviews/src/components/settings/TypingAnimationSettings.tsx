import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/EnhancedSelect";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";

interface TypingAnimationSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function TypingAnimationSettings({ settings, updateSetting }: TypingAnimationSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Typing Animation</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Configure how content is inserted during demos</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="typingMode">Typing Mode</Label>
            <Select
              value={settings.insertTypingMode}
              onValueChange={(value: string) => updateSetting("insertTypingMode", value)}
            >
              <SelectTrigger>
                <SelectValue value={settings.insertTypingMode} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="line-by-line">Line by Line</SelectItem>
                <SelectItem value="character-by-character">Character by Character</SelectItem>
                <SelectItem value="hacker-typer">Hacker Typer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600 dark:text-gray-300">Mode for inserting content during demos</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typingSpeed">Typing Speed (delay per character)</Label>
              <Input
                type="number"
                value={settings.insertTypingSpeed.toString()}
                onChange={(value) => updateSetting("insertTypingSpeed", Number(value))}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">Characters per second for character-by-character mode</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chunkSize">Hacker Typer Chunk Size</Label>
              <Input
                type="number"
                value={settings.hackerTyperChunkSize.toString()}
                onChange={(value) => updateSetting("hackerTyperChunkSize", Number(value))}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">Characters per keystroke in hacker-typer mode</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
