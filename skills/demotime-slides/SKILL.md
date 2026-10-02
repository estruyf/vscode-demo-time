---
name: demotime-slides
description: Create or update Demo Time slides, the markdown slides presented in VS Code with the Demo Time extension, and the act moves that open them. Use when someone asks to create, write, generate or improve slides, a deck or a presentation about a topic, or to turn a talk plan, interview, blog post or README into slides. Picks the right layout per slide, writes speaker notes, and adds the openSlide scenes to the act so the slides show up in the talk.
argument-hint: '[topic, or the material to turn into slides]'
---

# Create Demo Time slides

Demo Time slides are markdown files with YAML front matter, usually in `.demo/slides/`. A slide only
shows up in a talk when a **scene** in an **act** file (`.demo/*.json` or `.demo/*.yaml`) opens it
with an `openSlide` **move**. Always deliver both: the slide files and the scenes that open them.

## References

Read [slides](references/slides.md) and [layouts](references/layouts.md) before writing. Read the
others when you use what they cover:

- [Speaker notes](references/notes.md): the `<!-- notes -->` block
- [Components](references/components.md): `dt-arrow`, `dt-rectangle`, `dt-circle`, `dt-list`, ...
- [Animations and transitions](references/animations.md): click steps (`dt-show`, `dt-hide`),
  `fade-in`, ...
- [Mermaid diagrams](references/mermaid.md)
- [Custom layouts, header and footer](references/custom-layouts.md)
- [Themes](references/themes.md): built-in theme names
- [Act files and the openSlide move](references/moves.md)

Only use front matter properties, layouts, components and moves that these references describe.

## 1. Find the content

Use the first source that exists:

1. **A talk plan:** `.demo/talk-plan.md`. Follow its sections, key messages and speaker notes.
2. **An interview transcript:** for example `INTERVIEW.md`.
3. **Material the person gives you:** a blog post, README, abstract, outline or notes.

When there is nothing to go on beyond a topic, don't guess the talk. Plan it first with the
`demotime-talk-plan` skill (or, when that skill isn't available, ask for the audience, the length
and the key messages, one question at a time).

Also look at what is already in the workspace and match it:

- Existing slides in `.demo/slides/`: their theme, transitions, header and footer.
- A custom theme in the `demoTime.customTheme` setting (`.vscode/settings.json`) or in
  `.demo/theme/`.
- Existing acts in `.demo/`: their file format (JSON or YAML) and naming.

## 2. Plan the deck

- **Slide count:** about one content slide per one to two minutes of talk time, minus the live demo
  time. For example, 30 minutes with 10 minutes of demos is roughly 10 to 15 slides.
- **Files:** one markdown file per section, for example `.demo/slides/01-intro.md`,
  `.demo/slides/02-why-agents.md`. Slides in one file are separated by `---`. While presenting,
  "next" goes through the slides of the open file before it runs the next scene, so a file is a
  natural group of slides between two live demos.
- **Order:** follow the story: an opening slide, a section slide per section, the content, a
  takeaway slide and a closing slide.

## 3. Pick the layout that fits the content

Choose the layout per slide from what is on it. Don't put everything on `default`, and don't use the
same layout for more than three slides in a row.

| Content                                        | Layout                         |
| ---------------------------------------------- | ------------------------------ |
| Title of the talk, speaker, event              | `intro`                        |
| Start of a new section                         | `section`                      |
| One statement, a question, a big number        | `center`                       |
| A quote or testimonial                         | `quote`                        |
| A comparison, before and after, pros and cons  | `two-columns` with `::right::` |
| An image or diagram with an explanation        | `image-left` or `image-right`  |
| A full-screen photo or screenshot              | `image`                        |
| A background video                             | `video`                        |
| A diagram that builds up while you talk        | `animated` with an SVG file    |
| A list, a short code sample, a Mermaid diagram | `default`                      |

Use a custom layout (`customLayout`) only when the slide needs a structure no built-in layout has.

## 4. Write the slides

Front matter:

- Put the document front matter on the first slide of every file: `theme` (or `theme` plus
  `customTheme` for a custom theme), and optionally `transition`, `header` and `footer`. The other
  slides inherit these.
- `layout`, `image` and `autoAdvanceAfter` only apply to the slide that sets them. Give every other
  slide its own front matter block directly after its `---` separator:

  <!-- prettier-ignore -->
  ```md
  ---
  theme: default
  layout: intro
  transition: fadeIn
  ---

  # Building agents with VS Code

  Jane Doe · Contoso Conf 2026

  ---
  layout: section
  ---

  # Why agents?
  ```

Content:

- **One idea per slide.** At most six bullets and about 40 words on a slide. The script goes in the
  speaker notes, not on the slide.
- **Headings say the point.** "Agents fix their own build errors" beats "Agent features".
- **Active voice and short lines.** Cut filler words.
- **Code on slides stays short:** at most about 12 lines, always with a language on the code fence.
  Longer code belongs in a live demo (see the `demotime-code-demo` skill).
- **Fit on the slide.** A slide is 960×540 pixels and content past its edges is cut off. When a
  slide has too much content, split it into two slides. Only add `autoFit: true` to the front matter
  of a slide that can't be split, like one code sample: it scales the content down, to at most 50%.
- **Diagrams:** use Mermaid for flows and architecture, or the `animated` layout with an SVG when
  the diagram should build up.
- **Reveal step by step** with `dt-list`, `dt-show` or `dt-hide` only when the order of the reveal
  matters for the story. A normal list is fine otherwise. Leave a blank line around markdown inside
  these components.
- **Colours** in components: prefer the theme's CSS variables (for example
  `var(--vscode-textLink-foreground)`) over hard-coded colours, so they work in every theme.
- **Speaker notes:** add a `<!-- notes ... -->` block to every content slide with the talking points
  from the plan. The audience doesn't see it; the presenter view does.
- **Images:** use the images the person provided. Paths in front matter are relative to the
  workspace root (for example `.demo/assets/architecture.png`). When an image is missing, don't
  invent one: use a placeholder path, describe in the speaker notes what the image should show, and
  list the missing images in your summary.
- **Facts:** don't make up numbers, quotes or claims. Use the material, or mark the spot with a TODO
  in the speaker notes.

## 5. Add the moves that open the slides

Add a scene per slide file to the act that tells the talk, in presentation order, between the scenes
of the live demos. Update an existing act when there is one; otherwise create one, for example
`.demo/01-talk.json`. Keep the file format (JSON or YAML) the workspace already uses; JSON with the
`$schema` property is the default.

```json
{
  "$schema": "https://demotime.show/demo-time.schema.json",
  "title": "Building agents with VS Code",
  "description": "Slides and demos of the talk",
  "version": 3,
  "scenes": [
    {
      "title": "Intro",
      "moves": [{ "action": "openSlide", "path": ".demo/slides/01-intro.md" }]
    },
    {
      "title": "Why agents?",
      "moves": [{ "action": "openSlide", "path": ".demo/slides/02-why-agents.md" }]
    }
  ]
}
```

- `path` is relative to the workspace root.
- Use `"slide": <n>` (1-based) only to start a file at another slide than the first one.
- When the talk plan has a live demo between two slide files, leave room for it: add the demo scenes
  with the `demotime-code-demo` skill, or tell the person where they go.

## 6. Check the result

- Every slide file starts with front matter, and every slide-level front matter block is valid YAML
  with `key: value` lines.
- Layout, theme and transition names exist in the references.
- `---` separators are on their own line, and not inside code blocks.
- No slide has more content than the content rules allow. The slide preview marks a slide that
  doesn't fit with a **Content doesn't fit the slide** badge and a warning in the **Problems** panel;
  when you can read the problems of the workspace, fix these warnings.
- Every `openSlide` path points to a file that exists.
- Demo Time reports front matter problems of slide files in the **Problems** panel: invalid YAML,
  misspelled properties, invalid layout, theme or transition values, missing `image`, `video`,
  `svgFile`, `customTheme` or `customLayout` files, and a `---` followed by a `Word: text` line
  that hides slide content. When you can read the problems of the workspace, fix them.
- When the `demotime-code-demo` skill is installed, run its act validator
  (`node <demotime-code-demo skill folder>/scripts/validate-act.mjs`) from the workspace root.

Finish with a short summary: the files you created or changed, the slide count per file, the missing
images, and how to try it: open the Demo Time view and run the first scene, or open a slide file and
run **Demo Time: Open slide preview**.
