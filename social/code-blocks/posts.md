# Code blocks on slides

Image: [image.png](image.png) (1200×630 at 2×; alt text below).

Links:

- Docs (beta): https://beta.demotime.show/slides/code-blocks/
- Docs (after the release): https://demotime.show/slides/code-blocks/
- Beta version: https://demotime.show/beta/
- Issues: [#452](https://github.com/estruyf/vscode-demo-time/issues/452) (styling and notations), [#422](https://github.com/estruyf/vscode-demo-time/issues/422) (line steps), [#439](https://github.com/estruyf/vscode-demo-time/issues/439) (code from workspace files)

Not released yet: everything here is in the `[2.5.0] - 2026-xx-xx` section of the CHANGELOG and ships in the beta (pre-release) version for now. The texts below link the beta docs. Once 2.5.0 is out, switch them to `demotime.show` and drop "in the beta".

## Alt text

New in Demo Time: "Code blocks that walk through your code". On the right, a slide titled "Configure the app" with a code block for src/app.ts at step 2 of 3. Lines 4 to 8 are highlighted and the rest is dimmed. Line 5, theme "default", is marked as removed in red, and line 6, theme "demotime", as added in green. A note below shows the markdown that makes it: ```ts title="src/app.ts" {1-2|4-8|all}. On the left: line steps, diff and focus, titles and line numbers, and code from your files.

## X (280 characters)

New in the Demo Time beta: code blocks that walk through your code 🧑‍💻

Write {1-2|4-8|all} and every click highlights the next lines. Add diffs, focus, titles and line numbers, or show a file from your workspace that stays in sync.

https://beta.demotime.show/slides/code-blocks/

## Bluesky (300 characters)

New in the Demo Time beta: code blocks that walk through your code 🧑‍💻

Write {1-2|4-8|all} and every click highlights the next lines. Add diffs, focus, titles and line numbers, or pull code from a workspace file that stays in sync.

beta.demotime.show/slides/code-blocks/

## Mastodon (500 characters)

New in the Demo Time beta: code blocks that walk through your code 🧑‍💻

• Line steps: {1-2|4-8|all} highlights the next lines on every click
• Diff, focus, error, warning and info lines with [!code] comments
• Titles, captions and line numbers
• file="src/app.ts#region=setup" shows code from your workspace, and the slide updates when you save

https://beta.demotime.show/slides/code-blocks/

#VSCode #DevRel #PublicSpeaking

## LinkedIn

Code on a slide is out of date the moment you change the real code. And a wall of code on a slide makes it hard for people to follow along. The new code blocks in Demo Time fix both.

What you can do in a slide now:

• Line steps. Write ```ts {1-2|4-8|all} and every click highlights the next lines and dims the rest. They are click steps, so they work with the arrow keys, your clicker, the remote control and auto-advance.
• Diff and focus. Mark a line with a comment like // [!code ++], // [!code --], // [!code focus] or // [!code error]. The comment doesn't show on the slide.
• Titles, captions and line numbers with title="app.ts", caption="..." and showLineNumbers.
• Code from your workspace. file="src/app.ts#L10-24" or #region=setup shows the code from your project, and the slide updates when you save the file. A line or region that no longer exists shows up in the Problems panel.

All built-in themes have styles for it, and your own theme can change the colors with the --demotime-code-* CSS variables. The slide preview, PDF export and presenter view all show the same thing.

It's in the beta (pre-release) version of Demo Time now: https://beta.demotime.show/slides/code-blocks/

#VSCode #DevRel #PublicSpeaking
