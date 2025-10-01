import { IDemoTimeSettings } from "@demotime/common";
import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Textarea } from "../ui/Textarea";

interface TemplatesSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function TemplatesSettings({ settings, updateSetting }: TemplatesSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Slide Templates</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">HTML templates for slide headers and footers (supports Handlebars syntax)</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headerTemplate">Header Template</Label>
            <Textarea
              placeholder="Relative path to header template."
              value={settings.slideHeaderTemplate}
              onChange={(value) => updateSetting("slideHeaderTemplate", value)}
              rows={3}
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">HTML template for slide headers with Handlebars variables</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerTemplate">Footer Template</Label>
            <Textarea
              placeholder="Relative path to footer template."
              value={settings.slideFooterTemplate}
              onChange={(value) => updateSetting("slideFooterTemplate", value)}
              rows={3}
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">HTML template for slide footers with Handlebars variables</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
