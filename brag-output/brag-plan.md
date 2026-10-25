# /brag-slim plan: slide thumbnails + slide menu

**Focus:** the two newest features on `dev`: the slide thumbnails pane next to the slide preview
(click to open, drag or `Alt+Up` / `Alt+Down` to reorder) and the right-click slide menu (Show slide
contents, Edit speaker notes, Change layout, Hide slide while presenting, Insert / Duplicate /
Delete slide, Move slide up / down). Both edit and save the slide markdown file.

- **What it is:** Demo Time is a VS Code extension for presenting slides and live coding demos, and
  its slide preview now lets you reorder and change slides without touching the markdown.
- **For:** speakers who write their decks as markdown in VS Code.
- **Sets it apart:** the slides stay plain markdown, but you manage them like in a slide app.
- **Visual hook:** the pain everybody knows: selecting a slide between `---` lines to cut and
  paste it somewhere else.
- **Share caption:** Your markdown slides just got a sidebar and a right-click menu.

**Angle:** "Slides in markdown, managed like a slide app." Open on the cut & paste pain, then show the
real preview doing the job: click, drag, right-click.

**Tone:** `default` (punchy, playful, clean), in the website's look: `#15181f` background, `#ffd43b`
yellow, Hubot Sans italic 900 headlines, Mona Sans body, JetBrains Mono for code. Logo from
`docs/src/assets/demotime.svg`.

**Real UI:** the slide preview is rebuilt in HTML from `SlideThumbnailsPane.tsx` (numbered
thumbnails, focus ring on the active slide, dimmed hidden slide with the `eye-closed` icon, drop
line while dragging) and the `webview/context` menu from `apps/vscode-extension/package.json`
(exact item names, groups and the **Change layout** submenu, which leaves out the current layout).
Slides use the default theme's layout styles (section/intro: centered, `text-6xl` heading). The
deck ("Live demos, minus the panic") is a fictional sample; no real user data.

## Music

120 BPM, 2s bars, C major (C G Am F pop progression, starting on Am for the hook). Every cut and
every simulated click sits on the 8th-note grid (multiples of 0.25s). Synthesized in Node: kick,
clap, hats, bass, pad, pluck arpeggio; effects (clicks, whoosh, chime) tuned to the key and mixed
under the music.

## Storyboard (20s, 30fps, 1920×1080)

| Time | Scene | On screen | Audio |
|---|---|---|---|
| 0–2s | **Hook** | Full-bleed markdown editor: a slide between `---` lines gets selected, cut and pasted. Headline: "Reordering slides *like this?*" | Filtered pad and hats, key ticks on the cut (1.0s) and paste (1.5s), riser |
| 2–4s | **Reveal** | Logo + Demo Time. Eyebrow "New in the slide preview". Headline "Slide thumbnails + *a slide menu.*" | Kick drops in, whoosh |
| 4–10s | **Thumbnails** | The preview window rises in. Caption "Click to open. *Drag to reorder.*" Cursor clicks slide 4 (5.5s), drags it above slide 2 (6.0–7.5s) with the drop line, drop reflows the list, toast `✓ slides.md saved` | Full groove, clicks on 5.5/6.0/7.5, chime on drop |
| 10–16s | **Slide menu** | Caption "Right-click any slide *to change it.*" Right-click the slide (11.0s), **Change layout ▸ Section** (12.5s): the slide re-lays out as a section slide, toast `layout: section`. Right-click thumbnail 5 (14.0s), **Hide slide while presenting** (14.75s): it dims with the eye icon, toast `hide: true` | Groove continues, clicks on the beats |
| 16–20s | **Outro** | Logo + Demo Time. Headline "Edit your slides *right in the preview.*" Sub "Slides and live demos in VS Code", "Coming in the next beta · demotime.show" | F → G → C resolve, last chord rings out |

**Poster:** the settled frame at 12.3s (menu + Change layout submenu open, caption in), baked in as
frame 0.
