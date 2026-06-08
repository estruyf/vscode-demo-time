# Demo Time · Theme Builder

A visual editor for creating, importing, editing and exporting custom **CSS themes
for [Demo Time](https://demotime.show) slides**.

It produces a self-contained theme stylesheet (scoped to `.slide.<your-theme>`)
that layers on top of Demo Time's structural styles exactly like the built-in
themes — so what you preview is what you get on your slides.

## Features

- **Create** — start blank or from any of the seven built-in theme presets
  (default, minimal, monomi, unnamed, quantum, frost, pixels).
- **Live preview** — a pixel-accurate 960×540 slide rendered with the real Demo
  Time DOM, switchable across every layout (default, intro, section, quote,
  image, video, image-left, image-right, two-columns) and an optional light
  variant.
- **Colors** — background, text, headings, links, accent, blockquote and code.
- **Background images** — slide-wide or per-layout, with fit/position/repeat and
  a darken overlay; upload a file or point at a URL.
- **Typography** — font family, base size, per-heading size/weight, paragraph,
  lists and links.
- **Per-layout styling** — background, colors, alignment, padding and heading
  size for each layout individually.
- **Export** — download a ready-to-use `.css` file with usage instructions.
- **Import & edit** — re-open a theme created here with full fidelity (a JSON
  snapshot is embedded as a CSS comment), or best-effort import any other Demo
  Time theme CSS.

Everything runs in the browser; the working theme is auto-saved to
`localStorage`.

## Development

```bash
# from the repo root
npx nx dev theme-builder      # start the dev server (http://localhost:3002)
npx nx build theme-builder    # type-check + production build to dist/
```

Or from this folder: `yarn dev` / `yarn build`.

## How a theme is applied

Reference the exported file from a slide's front matter:

```md
---
theme: my-theme
customTheme: ./my-theme.css
---

# Your slide title
```

…or set `demoTime.customTheme` in `.vscode/settings.json` to apply it to every
slide.

## How it works

- `src/types/theme.ts` — the serializable `ThemeModel` (the single source of truth).
- `src/lib/generateCss.ts` — turns a model into a Demo Time theme stylesheet.
- `src/lib/parseCss.ts` — turns a stylesheet back into a model (lossless for files
  created here, best-effort otherwise).
- `src/lib/previewBase.ts` — a plain-CSS port of the webview's `preview.css`
  structural rules, used so the iframe preview matches real slides.
