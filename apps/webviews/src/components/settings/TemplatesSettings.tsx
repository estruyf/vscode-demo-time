import { Card } from "../ui/Card";
import { Label } from "../ui/Label";
import { Textarea } from "../ui/Textarea";
import { IDemoTimeSettings } from "../../types/IDemoTimeSettings";

interface TemplatesSettingsProps {
  settings: IDemoTimeSettings;
  updateSetting: (key: keyof IDemoTimeSettings, value: IDemoTimeSettings[keyof IDemoTimeSettings]) => void;
}

export default function TemplatesSettings({ settings, updateSetting }: TemplatesSettingsProps) {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-demo-time-white mb-2">Slide Templates</h2>
        <p className="text-demo-time-gray-4 mb-6">HTML templates for slide headers and footers (supports Handlebars syntax)</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headerTemplate">Header Template</Label>
            <Textarea
              placeholder="<header><h1>{{title}}</h1><span>{{date}}</span></header>"
              value={settings.slideHeaderTemplate}
              onChange={(value) => updateSetting("slideHeaderTemplate", value)}
              rows={3}
            />
            <p className="text-sm text-demo-time-gray-4">HTML template for slide headers with Handlebars variables</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerTemplate">Footer Template</Label>
            <Textarea
              placeholder="<footer><span>{{name}}</span><span>{{date}}</span></footer>"
              value={settings.slideFooterTemplate}
              onChange={(value) => updateSetting("slideFooterTemplate", value)}
              rows={3}
            />
            <p className="text-sm text-demo-time-gray-4">HTML template for slide footers with Handlebars variables</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
