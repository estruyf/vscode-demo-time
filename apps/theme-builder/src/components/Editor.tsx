import { Palette, Type, Image as ImageIcon, LayoutTemplate, Settings2 } from 'lucide-react';
import type {
  AlignItems,
  JustifyContent,
  LayoutKey,
  TextAlign,
  Typography,
} from '../types/theme';
import type { ThemeModelApi } from '../hooks/useThemeModel';
import { FONT_OPTIONS, LAYOUTS, POPULAR_GOOGLE_FONTS } from '../lib/constants';
import {
  ColorField,
  Field,
  NumberField,
  Section,
  SelectField,
  TextField,
  Toggle,
} from './controls';
import { ImageField } from './ImageField';
import { sanitizeName } from '../lib/generateCss';

const WEIGHTS = [
  { label: 'Light (300)', value: '300' },
  { label: 'Regular (400)', value: '400' },
  { label: 'Medium (500)', value: '500' },
  { label: 'Semibold (600)', value: '600' },
  { label: 'Bold (700)', value: '700' },
  { label: 'Extrabold (800)', value: '800' },
  { label: 'Black (900)', value: '900' },
];

export function Editor({
  api,
  selectedLayout,
}: {
  api: ThemeModelApi;
  selectedLayout: LayoutKey;
}) {
  const { model } = api;
  const layoutMeta = LAYOUTS.find((l) => l.key === selectedLayout)!;
  const layout = model.layouts[selectedLayout];

  return (
    <div className="flex flex-col">
      {model.basedOn && (
        <p className="border-b border-[var(--color-line)] bg-[var(--color-brand)]/10 px-4 py-2.5 text-[11px] leading-snug text-amber-200/90">
          Based on the <strong className="font-semibold">{model.displayName}</strong> design — its
          layout, spacing and special effects are kept exactly as the built-in theme. Edit the
          colours (globally here, or per layout below), fonts and background image to make it yours.
          Start from <strong className="font-semibold">Blank</strong> for full structural control.
        </p>
      )}

      {/* ---------------------------------------------------------- Theme */}
      <Section title="Theme" icon={<Settings2 size={16} />}>
        <TextField
          label="Display name"
          value={model.displayName}
          onChange={(displayName) => api.update({ displayName })}
        />
        <TextField
          label="CSS class name"
          hint={`Used as .slide.${sanitizeName(model.name)} and as the front matter "theme" value.`}
          value={model.name}
          onChange={(name) => api.update({ name })}
          mono
        />
        <SelectField
          label="Font family"
          value={
            FONT_OPTIONS.some((f) => f.value === model.typography.fontFamily)
              ? model.typography.fontFamily
              : '__custom'
          }
          onChange={(value) => {
            if (value !== '__custom') {
              api.updateTypography({ fontFamily: value });
            }
          }}
          options={[
            ...FONT_OPTIONS,
            ...(FONT_OPTIONS.some((f) => f.value === model.typography.fontFamily)
              ? []
              : [{ label: 'Custom', value: '__custom' }]),
          ]}
        />
        <TextField
          label="Google Font"
          hint="Type a family from fonts.google.com — it's loaded automatically and applied."
          value={model.typography.googleFont}
          placeholder="e.g. Inter"
          list={POPULAR_GOOGLE_FONTS}
          onChange={(googleFont) =>
            api.updateTypography(
              googleFont.trim()
                ? { googleFont, fontFamily: `"${googleFont.trim()}", sans-serif` }
                : { googleFont }
            )
          }
        />
        <TextField
          label="Custom font stack"
          value={model.typography.fontFamily}
          onChange={(fontFamily) => api.updateTypography({ fontFamily })}
          mono
        />
        <NumberField
          label="Base font size"
          value={model.typography.baseFontSize}
          onChange={(baseFontSize) => api.updateTypography({ baseFontSize })}
          min={12}
          max={48}
          unit="px"
        />

        <div className="rounded-md border border-[var(--color-line)] p-3">
          <Toggle
            label="Add light variant (.light)"
            checked={model.light.enabled}
            onChange={(enabled) => api.updateLight({ enabled })}
          />
          {model.light.enabled && (
            <div className="mt-3 space-y-3">
              <ColorField
                label="Light background"
                value={model.light.background}
                onChange={(background) => api.updateLight({ background })}
              />
              <ColorField
                label="Light text"
                value={model.light.text}
                onChange={(text) => api.updateLight({ text })}
              />
              <ColorField
                label="Light heading"
                value={model.light.heading}
                onChange={(heading) => api.updateLight({ heading })}
              />
              <ColorField
                label="Light link"
                value={model.light.link}
                onChange={(link) => api.updateLight({ link })}
              />
            </div>
          )}
        </div>
      </Section>

      {/* --------------------------------------------------------- Colors */}
      <Section title="Colors" icon={<Palette size={16} />}>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Background" value={model.colors.background} onChange={(v) => api.updateColors({ background: v })} />
          <ColorField label="Text" value={model.colors.text} onChange={(v) => api.updateColors({ text: v })} />
          <ColorField label="Heading" value={model.colors.heading} onChange={(v) => api.updateColors({ heading: v })} />
          <ColorField label="Heading bg" value={model.colors.headingBackground} onChange={(v) => api.updateColors({ headingBackground: v })} />
          <ColorField label="Accent" value={model.colors.accent} onChange={(v) => api.updateColors({ accent: v })} />
          <ColorField label="Link" value={model.colors.link} onChange={(v) => api.updateColors({ link: v })} />
          <ColorField label="Link hover" value={model.colors.linkHover} onChange={(v) => api.updateColors({ linkHover: v })} />
          <ColorField label="Quote border" value={model.colors.blockquoteBorder} onChange={(v) => api.updateColors({ blockquoteBorder: v })} />
          <ColorField label="Quote bg" value={model.colors.blockquoteBackground} onChange={(v) => api.updateColors({ blockquoteBackground: v })} />
          <ColorField label="Code color" value={model.colors.codeColor} onChange={(v) => api.updateColors({ codeColor: v })} />
          <ColorField label="Code bg" value={model.colors.codeBackground} onChange={(v) => api.updateColors({ codeBackground: v })} />
        </div>
      </Section>

      {/* ----------------------------------------------------- Background */}
      <Section title="Background image" icon={<ImageIcon size={16} />} defaultOpen={false}>
        <ImageField
          label="Slide-wide background"
          hint="Applied to every slide (the .slide__layout box). Individual layouts can override this below."
          value={model.backgroundImage}
          onChange={api.setBackgroundImage}
        />
      </Section>

      {/* ----------------------------------------------------- Typography */}
      <Section title="Typography" icon={<Type size={16} />} defaultOpen={false}>
        {(['h1', 'h2', 'h3', 'h4', 'h5'] as const).map((tag) => (
          <div key={tag} className="grid grid-cols-2 gap-3">
            <NumberField
              label={`${tag.toUpperCase()} size`}
              value={model.typography[tag].size}
              onChange={(size) => api.updateHeading(tag, { size })}
              min={0.75}
              max={6}
              step={0.125}
              unit="rem"
            />
            <SelectField
              label="Weight"
              value={String(model.typography[tag].weight)}
              onChange={(v) => api.updateHeading(tag, { weight: Number(v) })}
              options={WEIGHTS}
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Paragraph size"
            value={model.typography.paragraph.size}
            onChange={(size) => updateParagraph(api, model.typography, { size })}
            min={0.75}
            max={2.5}
            step={0.0625}
            unit="rem"
          />
          <NumberField
            label="Line height"
            value={model.typography.paragraph.lineHeight}
            onChange={(lineHeight) => updateParagraph(api, model.typography, { lineHeight })}
            min={1}
            max={2.4}
            step={0.05}
          />
        </div>
        <NumberField
          label="Paragraph opacity"
          value={model.typography.paragraph.opacity}
          onChange={(opacity) => updateParagraph(api, model.typography, { opacity })}
          min={0.3}
          max={1}
          step={0.05}
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="List size"
            value={model.typography.list.size}
            onChange={(size) => api.updateTypography({ list: { ...model.typography.list, size } })}
            min={0.75}
            max={2}
            step={0.0625}
            unit="rem"
          />
          <ColorField
            label="Bullet color"
            value={model.typography.list.markerColor}
            onChange={(markerColor) =>
              api.updateTypography({ list: { ...model.typography.list, markerColor } })
            }
          />
        </div>

        <Toggle
          label="Underline links"
          checked={model.typography.link.underline}
          onChange={(underline) =>
            api.updateTypography({ link: { ...model.typography.link, underline } })
          }
        />
      </Section>

      {/* --------------------------------------------------------- Layout */}
      <Section title={`Layout · ${layoutMeta.label}`} icon={<LayoutTemplate size={16} />}>
        <p className="-mt-1 text-[11px] leading-snug text-gray-500">{layoutMeta.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Background"
            value={layout.background}
            onChange={(background) => api.updateLayout(selectedLayout, { background })}
          />
          <ColorField
            label="Text"
            value={layout.color}
            onChange={(color) => api.updateLayout(selectedLayout, { color })}
          />
          <ColorField
            label="Heading color"
            value={layout.headingColor}
            onChange={(headingColor) => api.updateLayout(selectedLayout, { headingColor })}
          />
          <ColorField
            label="Heading bg"
            value={layout.headingBackground}
            onChange={(headingBackground) => api.updateLayout(selectedLayout, { headingBackground })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField<JustifyContent>
            label="Vertical"
            value={layout.justify}
            onChange={(justify) => api.updateLayout(selectedLayout, { justify })}
            options={[
              { label: 'Top', value: 'start' },
              { label: 'Middle', value: 'center' },
              { label: 'Bottom', value: 'end' },
            ]}
          />
          <SelectField<AlignItems>
            label="Horizontal"
            value={layout.align}
            onChange={(align) => api.updateLayout(selectedLayout, { align })}
            options={[
              { label: 'Left', value: 'start' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'end' },
              { label: 'Stretch', value: 'stretch' },
            ]}
          />
          <SelectField<TextAlign>
            label="Text align"
            value={layout.textAlign}
            onChange={(textAlign) => api.updateLayout(selectedLayout, { textAlign })}
            options={[
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' },
            ]}
          />
          <NumberField
            label="Padding"
            value={layout.padding}
            onChange={(padding) => api.updateLayout(selectedLayout, { padding })}
            min={0}
            max={8}
            step={0.25}
            unit="rem"
          />
        </div>

        <NumberField
          label="Heading size override (0 = use typography)"
          value={layout.headingSize}
          onChange={(headingSize) => api.updateLayout(selectedLayout, { headingSize })}
          min={0}
          max={6}
          step={0.25}
          unit="rem"
        />

        <Field
          label={
            selectedLayout === 'image-left' || selectedLayout === 'image-right'
              ? 'Side image styling'
              : 'Background image (this layout only)'
          }
          hint={
            selectedLayout === 'image-left' || selectedLayout === 'image-right'
              ? 'In a real slide the image comes from the slide’s "image" front matter. Set a placeholder here to preview the fit/position your theme applies.'
              : undefined
          }
        >
          <div className="pt-1">
            <ImageField
              label=""
              value={layout.backgroundImage}
              onChange={(backgroundImage) => api.updateLayout(selectedLayout, { backgroundImage })}
            />
          </div>
        </Field>
      </Section>
    </div>
  );
}

function updateParagraph(
  api: ThemeModelApi,
  typography: Typography,
  changes: Partial<Typography['paragraph']>
) {
  api.updateTypography({ paragraph: { ...typography.paragraph, ...changes } });
}
