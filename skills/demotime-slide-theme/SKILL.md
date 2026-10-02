---
name: demotime-slide-theme
description: Create or update a custom slide theme for Demo Time, the VS Code extension for markdown slides and live demos. Use when someone asks for a slide theme, a slide design, slide styling or branded slides, for example from brand colours, a logo, a website or a mood like "dark, terminal feel". Produces the theme CSS that opens in the Demo Time Theme Builder, custom layouts or header and footer templates when needed, and a preview deck that shows every layout in the new theme. Not for VS Code colour themes.
argument-hint: '[brand colours, logo, website URL or mood]'
---

# Create a Demo Time slide theme

A Demo Time slide theme is a CSS file, usually in `.demo/theme/`. Its rules are scoped to
`.slide.<name>`, and a slide uses it with `theme: <name>` in its front matter. The CSS file itself is
loaded globally with the `demoTime.customTheme` setting or per slide file with the `customTheme`
front matter property.

## References

- [Custom themes and the Theme Builder](references/custom-theme.md)
- [Theme model](references/theme-model.md): the JSON the script turns into CSS
- [Built-in themes](references/built-in-themes.md): names, looks and CSS variables. Their compiled
  CSS is in `references/built-in-css/`; read one to see the slide DOM and the class per layout.
- [Layouts](references/layouts.md),
  [custom layouts, header and footer](references/custom-layouts.md) and
  [components](references/components.md)
- [Designed theme starter](assets/designed-theme.css): the structure of a hand-written theme

## 1. Gather the input

Use what the person gives you: brand colours, a logo, fonts, a website, a screenshot or a mood.

- **Website:** when you can fetch it, take the colours and fonts from its CSS and visible design.
  Otherwise ask for the main colours.
- **Logo and images:** keep the files in the workspace, for example `.demo/assets/logo.svg`.
- **Ask only for what you can't decide yourself**, one question at a time: the theme name, dark or
  light, and whether the theme should follow the active VS Code theme colours.

Check the workspace first: an existing theme in `.demo/theme/`, the `demoTime.customTheme` setting
in `.vscode/settings.json`, custom layouts in `.demo/layouts/`, and the slides in `.demo/slides/`
(which layouts and HTML they use). When you change an existing theme, keep its approach.

## 2. Choose the kind of theme

There are two kinds of themes. Decide with the person before you write anything, because the Theme
Builder handles them differently.

|               | Theme Builder theme                                                                             | Designed theme                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Good for      | A brand: colours, Google Fonts, background images, heading sizes, spacing per layout            | A visual concept: self-hosted fonts, decorations, styled custom layouts, HTML components that tell the story |
| How           | A theme model, turned into CSS by the bundled script ([step 3](#3-build-a-theme-builder-theme)) | Hand-written CSS ([step 4](#4-write-a-designed-theme))                                                       |
| Theme Builder | Opens without losing anything, so the person can keep editing it there                          | Imports only the colours and the base font size. Exporting from the Theme Builder replaces the whole design  |

Default to a **Theme Builder theme**. Choose a **designed theme** when the person asks for more than
the Theme Builder can express, and tell them it is maintained as CSS, not in the Theme Builder.

On top of either kind, use the lightest extra that does the job:

- **Header and footer templates** for a logo, the talk title, slide numbers or a progress bar on
  every slide: the `demoTime.slideHeaderTemplate` and `demoTime.slideFooterTemplate` settings, or the
  `header` and `footer` front matter. Don't build a custom layout for a logo.
- **Custom layouts** ([step 5](#5-custom-layouts-only-when-needed)) only when a slide needs a structure
  that no built-in layout has, for example a speaker card with photo, name and role.

## 3. Build a Theme Builder theme

The script needs Node.js 18 or later. It lives in the `scripts` folder next to this `SKILL.md`; use
its full path. Run every command from the workspace root.

1. **Pick a starting point.** Build on a built-in design when the person likes its look; start from
   `blank` for a theme from scratch. Print the model of a preset with:

   ```bash
   node <this skill folder>/scripts/build-theme.mjs --preset <blank|default|minimal|monomi|unnamed|quantum|frost|pixels>
   ```

   To change an existing Theme Builder theme, read its model instead:

   ```bash
   node <this skill folder>/scripts/build-theme.mjs --read .demo/theme/<name>.css
   ```

2. **Write the model** to a temporary file, for example `.demo/theme/<name>.theme.json`. Follow the
   [theme model](references/theme-model.md). Set at least `name` (CSS-safe, lowercase, dashes),
   `displayName`, `colors` and `typography`. A partial model is fine; missing values get the Theme
   Builder defaults.
   - Check the contrast of text on background: at least 4.5:1 for body text.
   - Use Google Fonts through `typography.googleFont` and `typography.headingGoogleFont`.
   - Add a background image through `backgroundImage` or per layout in `layouts.<layout>`.
   - Put small extras the model can't express in `customCss`, scoped to `.slide.<name>`. It survives
     a round trip through the Theme Builder. When the extras grow into a design of their own, make
     it a designed theme instead.

3. **Generate the CSS:**

   ```bash
   node <this skill folder>/scripts/build-theme.mjs .demo/theme/<name>.theme.json --out .demo/theme/<name>.css
   ```

4. **Delete the temporary model file.** The CSS contains the model, so `--read` gets it back.

Never edit the generated CSS by hand. The Theme Builder restores the model embedded in the file and
drops hand-made changes. Change the model (`--read`, edit, generate) or use the Theme Builder.

**Without Node.js**, write a designed theme instead and tell the person.

## 4. Write a designed theme

Start from [the designed theme starter](assets/designed-theme.css) and check the DOM in the closest
file in `references/built-in-css/`. Keep everything in one file, `.demo/theme/<name>.css`:

- **Scope:** nest every rule in `.slide.<name> { ... }`. Put `@font-face` and `@keyframes` at the
  top level, and prefix keyframe names with the theme name.
- **Design tokens:** declare the palette and fonts once as theme variables (`--<prefix>-*`), then
  map them onto the `--demotime-*` variables. Built-in parts (links, quotes, code, components, the
  progress bar) use those, and the Theme Builder reads its colours from them.
- **Fonts and images next to the CSS:** `url("MyFont.ttf")` resolves relative to the CSS file, so
  keep the files in `.demo/theme/`. Always add fallbacks in the font stack.
- **Canvas and flow:** background and decorations on `.slide__layout`, padding and spacing between
  blocks on `.slide__content__inner`.
- **Per layout:** style `.intro`, `.section`, `.quote`, `.center`, `.two-columns` (with
  `.slide__left`, `.slide__right` and `.slide__section`), `.image`, `.image-left`
  (`.slide__image_left`), `.image-right` (`.slide__image_right`) and `.video`. Give each layout a
  clear role in the story, and make the intro and section slides stand out.
- **Give markdown a meaning:** decide what `**strong**`, `*em*`, `<small>`, blockquotes, list markers
  and the `h1` decoration look like (for example `<small>` as a source line at the bottom), and list
  it in the comment at the top of the CSS so slide authors know what to write.
- **Knobs for slides:** expose CSS variables that a slide can set in a `<style>` block, for example a
  label on a column:

  ```css
  .slide__right::after {
    content: var(--brand-label, '');
  }
  ```

  ```html
  <style>
    .slide__right {
      --brand-label: 'after';
    }
  </style>
  ```

- **HTML components:** for visuals that markdown can't make (a dashboard, a timeline, a chat
  window), write plain HTML in the slide with classes the theme styles (`.board`, `.board__item`),
  and show a change over consecutive slides with modifier classes (`.is-new`, `.is-done`). Combine
  them with the Demo Time components (`text-typewriter`, `dt-show`, ...) instead of writing scripts.

## 5. Custom layouts (only when needed)

- Put them in `.demo/layouts/` as Handlebars files (`.hbs` or `.html`) and use them with
  `customLayout: .demo/layouts/<layout>.hbs`.
- Take the content from the front matter (`{{metadata.name}}`) and render the slide body with
  `{{{content}}}`. Use `{{#if metadata.x}}` for optional parts, and the `eq` helper for variants:
  `{{#if (eq metadata.position "left")}}`.
- Workspace images: a relative `<img src>` resolves from the workspace root, so
  `<img src="{{metadata.imageSrc}}">` with `imageSrc: .demo/assets/me.jpg` works. In CSS (a
  `background-image` in a `<style>` block), use `url('{{metadata.webViewUrl}}/{{metadata.imageSrc}}')`.
- Style the layout in the theme, not in the layout file. Target the slide with `:has()`, for
  example `.slide__content__inner:has(> .about-me) { padding: 0; }`. Only values from the front
  matter go in a `<style>` block in the layout.

## 6. Apply the theme

Ask whether the theme is for every slide or for some files:

- **Every slide:** set `"demoTime.customTheme": ".demo/theme/<name>.css"` in
  `.vscode/settings.json`.
- **Per slide file:** add `customTheme: .demo/theme/<name>.css` to the document front matter.

Either way, the slides need `theme: <name>` in the document front matter of every slide file. The
CSS only styles slides with that class. Update the existing slide files when the person agrees.

## 7. Create a preview deck

Write `.demo/slides/<name>-theme-preview.md` with one slide per layout, so the person can review the
theme: `intro`, `section`, `default` (with a list, an ordered list, bold and italic text, inline
code, a link, a code block, a quote and a `<small>` line), `center`, `quote`, `two-columns`,
`image-left`, `image-right` and `image`. Use the logo or another image from the workspace for the
image layouts. Add slides for every custom layout, HTML component and slide knob the theme has, and
a slide with a table when the theme styles tables.

<!-- prettier-ignore -->
```md
---
theme: <name>
customTheme: .demo/theme/<name>.css
layout: intro
---

# <Display name>

Theme preview

---
layout: section
---

# Section title

A subtitle
```

Open it with **Demo Time: Open slide preview** to check every layout. Don't add the preview deck to
the talk's act.

## 8. Hand over

Summarize the files you created, how the theme is applied, and how to keep editing it:

- **Theme Builder theme:** open the CSS in the Theme Builder (`Demo Time: Theme Builder` >
  **Import**) to fine-tune colours and fonts.
- **Designed theme:** edit the CSS. The Theme Builder only reads its colours, so don't export over
  it from there.
