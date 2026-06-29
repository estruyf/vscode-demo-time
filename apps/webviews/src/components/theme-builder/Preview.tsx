import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import type { LayoutKey, ThemeModel } from '../../types/theme';
import { LAYOUTS, SLIDE_HEIGHT, SLIDE_WIDTH } from '../../utils/theme-builder/constants';
import { generateCss, sanitizeName } from '../../utils/theme-builder/generateCss';
import { getSlideInner, placeholderImage } from '../../utils/theme-builder/sampleContent';
import { buildPreviewDocument } from '../../utils/theme-builder/previewBase';
import { collectVscodeVariables } from '../../utils/theme-builder/importVscodeTheme';

// A fallback image for the image-left/right columns; the theme can override it.
const PREVIEW_CSS = `.slide__image_left,.slide__image_right{background-image:url('${placeholderImage()}');background-size:cover;background-position:center;background-repeat:no-repeat;}`;

export function Preview({
  model,
  selectedLayout,
  onSelectLayout,
  isLight,
  onToggleLight,
}: {
  model: ThemeModel;
  selectedLayout: LayoutKey;
  onSelectLayout: (layout: LayoutKey) => void;
  /** Controlled by the parent so it resets when the model is replaced. */
  isLight: boolean;
  onToggleLight: () => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  const themeName = sanitizeName(model.name);
  // Light only applies when the theme actually defines a light variant.
  const effectiveLight = isLight && model.light.enabled;
  // Live theme CSS (no embedded JSON needed for the preview).
  const themeCss = React.useMemo(() => generateCss(model, { embedModel: false }), [model]);
  const themeCssRef = React.useRef(themeCss);
  themeCssRef.current = themeCss;

  // The VS Code editor-theme variables, forwarded into the sandboxed iframe so
  // the theme's `var(--vscode-…)` references resolve. Re-read when the active
  // VS Code theme changes (it rewrites the inline vars on the host <html>).
  const [rootVars, setRootVars] = React.useState(collectVscodeVariables);
  const rootVarsRef = React.useRef(rootVars);
  rootVarsRef.current = rootVars;
  React.useEffect(() => {
    const observer = new MutationObserver(() => setRootVars(collectVscodeVariables()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    return () => observer.disconnect();
  }, []);

  const slideInner = React.useMemo(() => getSlideInner(selectedLayout), [selectedLayout]);

  // Rebuild the document only when the *structure* changes (layout, variant,
  // name). Colour/typography edits update the injected <style> in place below,
  // which keeps the preview flicker-free while dragging sliders.
  const doc = React.useMemo(
    () =>
      buildPreviewDocument({
        themeName,
        layoutClass: selectedLayout,
        themeCss: themeCssRef.current,
        slideInner,
        isLight: effectiveLight,
        previewCss: PREVIEW_CSS,
        rootVars: rootVarsRef.current,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeName, selectedLayout, slideInner, effectiveLight]
  );

  // Push live theme CSS into the already-rendered iframe without reloading it.
  React.useEffect(() => {
    const styleEl = iframeRef.current?.contentDocument?.getElementById('theme');
    if (styleEl) {
      styleEl.textContent = themeCss;
    }
  }, [themeCss]);

  // Keep the forwarded VS Code variables live too (e.g. on a theme switch),
  // without rebuilding the whole document.
  React.useEffect(() => {
    const styleEl = iframeRef.current?.contentDocument?.getElementById('vscode-vars');
    if (styleEl) {
      styleEl.textContent = `:root{${rootVars}}`;
    }
  }, [rootVars]);

  // Fit the 960×540 slide into the available stage area.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const update = () => {
      const pad = 48;
      const w = stage.clientWidth - pad;
      const h = stage.clientHeight - pad;
      setScale(Math.max(0.1, Math.min(w / SLIDE_WIDTH, h / SLIDE_HEIGHT)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Layout tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-2">
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => onSelectLayout(l.key)}
              title={l.description}
              aria-pressed={selectedLayout === l.key}
              className={clsx(
                'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                selectedLayout === l.key
                  ? 'bg-[var(--color-brand)] text-black'
                  : 'text-gray-300 hover:bg-[var(--color-surface-3)]'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        {model.light.enabled && (
          <button
            type="button"
            onClick={onToggleLight}
            aria-pressed={effectiveLight}
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] px-2.5 py-1 text-xs text-gray-200 hover:border-[var(--color-brand)]"
            title="Toggle light variant"
          >
            {effectiveLight ? <Sun size={14} /> : <Moon size={14} />}
            {effectiveLight ? 'Light' : 'Dark'}
          </button>
        )}
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden p-6"
        style={{
          backgroundColor: '#0b0d12',
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            borderRadius: 6,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <iframe
            ref={iframeRef}
            title="Slide preview"
            srcDoc={doc}
            sandbox="allow-same-origin"
            onLoad={() => {
              // Re-apply the latest CSS + forwarded variables after every
              // (re)load so an edit made during a structure rebuild can't be lost.
              const frameDoc = iframeRef.current?.contentDocument;
              const themeEl = frameDoc?.getElementById('theme');
              if (themeEl) {
                themeEl.textContent = themeCssRef.current;
              }
              const varsEl = frameDoc?.getElementById('vscode-vars');
              if (varsEl) {
                varsEl.textContent = `:root{${rootVarsRef.current}}`;
              }
            }}
            style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, border: 0, display: 'block' }}
          />
        </div>

        <span className="absolute bottom-2 right-3 rounded bg-black/40 px-2 py-0.5 text-[11px] text-gray-400">
          {SLIDE_WIDTH}×{SLIDE_HEIGHT} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
