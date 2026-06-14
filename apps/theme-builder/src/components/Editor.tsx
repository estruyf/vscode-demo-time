import * as React from 'react';
import clsx from 'clsx';
import { Palette, Type, Image as ImageIcon, LayoutTemplate, Settings2, Code2 } from 'lucide-react';
import type {
  AlignItems,
  JustifyContent,
  LayoutColors,
  LayoutKey,
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

/** Per-layout weight options — `0` inherits the global weight. */
const LAYOUT_WEIGHTS = [{ label: 'Inherit', value: '0' }, ...WEIGHTS];

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

/** The per-layout colour fields, in display order. */
const LAYOUT_COLOR_FIELDS: { label: string; key: keyof LayoutColors }[] = [
  { label: 'Background', key: 'background' },
  { label: 'Text', key: 'text' },
  { label: 'Paragraph', key: 'paragraph' },
  { label: 'Heading', key: 'heading' },
  { label: 'Heading bg', key: 'headingBackground' },
  { label: 'Accent', key: 'accent' },
  { label: 'Link', key: 'link' },
  { label: 'Link hover', key: 'linkHover' },
  { label: 'Quote text', key: 'blockquoteText' },
  { label: 'Quote border', key: 'blockquoteBorder' },
  { label: 'Quote bg', key: 'blockquoteBackground' },
  { label: 'Code color', key: 'codeColor' },
  { label: 'Code bg', key: 'codeBackground' },
];

type Scope = 'global' | 'slide';

export function Editor({
  api,
  selectedLayout,
  onSelectLayout,
}: {
  api: ThemeModelApi;
  selectedLayout: LayoutKey;
  onSelectLayout: (layout: LayoutKey) => void;
}) {
  const { model } = api;
  const [scope, setScope] = React.useState<Scope>('global');
  const layoutMeta = LAYOUTS.find((l) => l.key === selectedLayout)!;
  const layout = model.layouts[selectedLayout];
  const isSideImage = selectedLayout === 'image-left' || selectedLayout === 'image-right';

  return (
    <div className="flex flex-col">
      {model.basedOn && (
        <p className="border-b border-[var(--color-line)] bg-[var(--color-brand)]/10 px-4 py-2.5 text-[11px] leading-snug text-amber-200/90">
          Based on the <strong className="font-semibold">{model.displayName}</strong> design — its
          layout, spacing and special effects are kept exactly as the built-in theme. Edit the
          colours, fonts and background image to make it yours. Start from{' '}
          <strong className="font-semibold">Blank</strong> for full structural control.
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
          label="Body font family"
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
          label="Body Google Font"
          hint="Used for body text and paragraphs. Type a family from fonts.google.com — it's loaded automatically."
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
          label="Body font stack"
          value={model.typography.fontFamily}
          onChange={(fontFamily) => api.updateTypography({ fontFamily })}
          mono
        />
        <TextField
          label="Heading Google Font"
          hint="Optional separate font for h1–h5. Leave empty to use the body font."
          value={model.typography.headingGoogleFont}
          placeholder="e.g. Poppins"
          list={POPULAR_GOOGLE_FONTS}
          onChange={(headingGoogleFont) =>
            api.updateTypography(
              headingGoogleFont.trim()
                ? {
                  headingGoogleFont,
                  headingFontFamily: `"${headingGoogleFont.trim()}", sans-serif`,
                }
                : { headingGoogleFont: '', headingFontFamily: '' }
            )
          }
        />
        <TextField
          label="Heading font stack"
          hint="Empty = headings inherit the body font."
          value={model.typography.headingFontFamily}
          onChange={(headingFontFamily) => api.updateTypography({ headingFontFamily })}
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

        <div className="hidden rounded-md border border-[var(--color-line)] p-3">
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

      {/* -------------------------------------------------- Scope toggle */}
      <div className="border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5 text-sm">
          {(['global', 'slide'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className={clsx(
                'flex-1 rounded px-3 py-1.5 font-medium transition-colors',
                scope === s
                  ? 'bg-[var(--color-brand)] text-black'
                  : 'text-gray-300 hover:text-white'
              )}
            >
              {s === 'global' ? 'Global' : 'Slide'}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-gray-500">
          {scope === 'global'
            ? 'Editing the theme-wide styling that every slide inherits.'
            : 'Editing one layout. Its values override the global styling for that layout only.'}
        </p>
        {scope === 'slide' && (
          <div className="mt-2">
            <SelectField<LayoutKey>
              label="Layout"
              value={selectedLayout}
              onChange={onSelectLayout}
              options={LAYOUTS.map((l) => ({ label: l.label, value: l.key }))}
            />
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- Colors */}
      <Section title="Colors" icon={<Palette size={16} />}>
        {scope === 'global' ? (
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={model.colors.background} onChange={(v) => api.updateColors({ background: v })} />
            <ColorField label="Text" value={model.colors.text} onChange={(v) => api.updateColors({ text: v })} />
            <ColorField label="Heading" value={model.colors.heading} onChange={(v) => api.updateColors({ heading: v })} />
            <ColorField label="Heading bg" value={model.colors.headingBackground} onChange={(v) => api.updateColors({ headingBackground: v })} />
            <ColorField label="Accent" value={model.colors.accent} onChange={(v) => api.updateColors({ accent: v })} />
            <ColorField label="Link" value={model.colors.link} onChange={(v) => api.updateColors({ link: v })} />
            <ColorField label="Link hover" value={model.colors.linkHover} onChange={(v) => api.updateColors({ linkHover: v })} />
            <ColorField label="Quote text" value={model.colors.blockquoteText} onChange={(v) => api.updateColors({ blockquoteText: v })} />
            <ColorField label="Quote border" value={model.colors.blockquoteBorder} onChange={(v) => api.updateColors({ blockquoteBorder: v })} />
            <ColorField label="Quote bg" value={model.colors.blockquoteBackground} onChange={(v) => api.updateColors({ blockquoteBackground: v })} />
            <ColorField label="Code color" value={model.colors.codeColor} onChange={(v) => api.updateColors({ codeColor: v })} />
            <ColorField label="Code bg" value={model.colors.codeBackground} onChange={(v) => api.updateColors({ codeBackground: v })} />
          </div>
        ) : (
          <>
            <p className="-mt-1 mb-1 text-[11px] leading-snug text-gray-500">
              Leave a colour empty to inherit the global value.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {LAYOUT_COLOR_FIELDS.map(({ label, key }) => (
                <ColorField
                  key={key}
                  label={label}
                  value={layout.colors[key]}
                  onChange={(v) => api.updateLayoutColors(selectedLayout, { [key]: v })}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ----------------------------------------------------- Background */}
      <Section title="Background image" icon={<ImageIcon size={16} />} defaultOpen={false}>
        {scope === 'global' ? (
          <ImageField
            label="Slide-wide background"
            hint="Applied to every slide (the .slide__layout box). Individual layouts can override this in the Slide scope."
            value={model.backgroundImage}
            onChange={api.setBackgroundImage}
          />
        ) : (
          <Field
            label={isSideImage ? 'Side image styling' : 'Background image (this layout only)'}
            hint={
              isSideImage
                ? `In a real slide the image comes from the slide's "image" front matter. Set a placeholder here to preview the fit/position your theme applies.`
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
        )}
      </Section>

      {/* ----------------------------------------------------- Typography */}
      <Section title="Typography" icon={<Type size={16} />} defaultOpen={false}>
        {scope === 'global' ? (
          <>
            {HEADING_TAGS.map((tag) => (
              <div key={tag} className="grid grid-cols-2 gap-3">
                <NumberField
                  label={`${tag.toUpperCase()} size`}
                  value={model.typography[tag].size}
                  onChange={(size) => api.updateHeading(tag, { size })}
                  min={0.75}
                  max={6}
                  step={0.125}
                  unit="em"
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
                unit="em"
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
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="List size"
                value={model.typography.list.size}
                onChange={(size) => api.updateTypography({ list: { ...model.typography.list, size } })}
                min={0.75}
                max={2}
                step={0.0625}
                unit="em"
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
          </>
        ) : (
          <>
            <p className="-mt-1 mb-1 text-[11px] leading-snug text-gray-500">
              Leave a value at 0 to inherit the global typography.
            </p>
            {HEADING_TAGS.map((tag) => (
              <div key={tag} className="grid grid-cols-2 gap-3">
                <NumberField
                  label={`${tag.toUpperCase()} size`}
                  value={layout.typography[tag].size}
                  onChange={(size) =>
                    api.updateLayoutTypography(selectedLayout, {
                      [tag]: { ...layout.typography[tag], size },
                    })
                  }
                  min={0}
                  max={6}
                  step={0.125}
                  unit="em"
                />
                <SelectField
                  label="Weight"
                  value={String(layout.typography[tag].weight)}
                  onChange={(v) =>
                    api.updateLayoutTypography(selectedLayout, {
                      [tag]: { ...layout.typography[tag], weight: Number(v) },
                    })
                  }
                  options={LAYOUT_WEIGHTS}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Paragraph size"
                value={layout.typography.paragraph.size}
                onChange={(size) =>
                  api.updateLayoutTypography(selectedLayout, {
                    paragraph: { ...layout.typography.paragraph, size },
                  })
                }
                min={0}
                max={2.5}
                step={0.0625}
                unit="em"
              />
              <NumberField
                label="Line height"
                value={layout.typography.paragraph.lineHeight}
                onChange={(lineHeight) =>
                  api.updateLayoutTypography(selectedLayout, {
                    paragraph: { ...layout.typography.paragraph, lineHeight },
                  })
                }
                min={0}
                max={2.4}
                step={0.05}
              />
            </div>
            <NumberField
              label="List size"
              value={layout.typography.list.size}
              onChange={(size) =>
                api.updateLayoutTypography(selectedLayout, { list: { size } })
              }
              min={0}
              max={2}
              step={0.0625}
              unit="em"
            />
          </>
        )}
      </Section>

      {/* ----------------------------------------------- Layout structure */}
      {scope === 'slide' && (
        <Section title={`Layout · ${layoutMeta.label}`} icon={<LayoutTemplate size={16} />}>
          <p className="-mt-1 text-[11px] leading-snug text-gray-500">{layoutMeta.description}</p>

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
          </div>

          <NumberField
            label="Padding"
            value={layout.padding}
            onChange={(padding) => api.updateLayout(selectedLayout, { padding })}
            min={0}
            max={8}
            step={0.25}
            unit="rem"
          />
        </Section>
      )}

      {/* --------------------------------------------------------- Advanced */}
      <Section title="Advanced CSS" icon={<Code2 size={16} />} defaultOpen={false}>
        <p className="-mt-1 text-[11px] leading-snug text-gray-500">
          Written verbatim after the generated rules. Use this for overrides the visual editor can't express.
        </p>
        <textarea
          aria-label="Custom CSS"
          className="w-full resize-y rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-xs text-gray-100 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          rows={10}
          spellCheck={false}
          placeholder={`.slide.${sanitizeName(model.name)} {\n  /* your custom rules here */\n}`}
          value={model.customCss ?? ''}
          onChange={(e) => api.update({ customCss: e.target.value })}
        />
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
