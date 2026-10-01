import { IDemoTimeSettings } from "@demotime/common";
import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { EnhancedSelect, EnhancedSelectContent, EnhancedSelectItem, EnhancedSelectTrigger, EnhancedSelectValue } from "../ui/EnhancedSelect";

interface TemplatesSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function TemplatesSettings({ settings, updateSetting }: TemplatesSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Slide Templates</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">HTML templates for slide headers and footers (supports Handlebars syntax), and the slide progress bar</p>
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
          <div className="space-y-2">
            <Label htmlFor="presentationTitle">Presentation Title</Label>
            <Input
              id="presentationTitle"
              placeholder="Name of the workspace folder"
              value={settings.presentationTitle || ""}
              onChange={(value) => updateSetting("presentationTitle", value)}
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">Title for the {"{{presentationTitle}}"} placeholder in header and footer templates</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slideProgressBar">Progress Bar</Label>
            <EnhancedSelect
              value={settings.slideProgressBar || "none"}
              onValueChange={(value: string) => updateSetting("slideProgressBar", value)}
            >
              <EnhancedSelectTrigger>
                <EnhancedSelectValue value={settings.slideProgressBar || "none"} />
              </EnhancedSelectTrigger>
              <EnhancedSelectContent>
                <EnhancedSelectItem value="none">None</EnhancedSelectItem>
                <EnhancedSelectItem value="top">Top</EnhancedSelectItem>
                <EnhancedSelectItem value="bottom">Bottom</EnhancedSelectItem>
              </EnhancedSelectContent>
            </EnhancedSelect>
            <p className="text-sm text-gray-600 dark:text-gray-300">Show a thin progress bar on the slides. Use the progress front matter property to change it for a slide.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
