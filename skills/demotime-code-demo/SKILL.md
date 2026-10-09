---
name: demotime-code-demo
description: Script a live coding demo with Demo Time, the VS Code extension that runs demos as scenes and moves from an act file. Use when someone asks to create, script or automate a demo, walkthrough or live coding session for code, files, a diff or a pull request, or to add demo scenes to a Demo Time act. Writes valid act files (.demo/*.json or .yaml) that start from a reset-able state, type or patch the code, highlight what the presenter explains, and validates them against the Demo Time schema.
argument-hint: '[files, diff or PR, and what the demo should explain]'
---

# Script a Demo Time code demo

A Demo Time **act** is a JSON or YAML file in the `.demo` folder. It has **scenes**, the steps the
presenter triggers one by one while presenting, and every scene runs its **moves** (actions) in
order. Your job is to turn code and a story into scenes that run the same way every time.

## 1. Read the schema first

Only use actions and properties that exist. Read the act file JSON schema before writing moves:

1. `docs/public/demo-time.schema.json` when the workspace is the Demo Time repository itself.
2. Otherwise the bundled copy: [references/demo-time.schema.json](references/demo-time.schema.json).
3. The published schema: https://demotime.show/demo-time.schema.json.

The schema lists every `action`, and its `allOf` section says which properties each action requires
and accepts. Then read the reference of every action group you use:

- [Act files](references/act-files.md): structure, scenes, icons, notes
- [File actions](references/actions/file.md): `create`, `open`, `copy`, `rename`, ...
- [Text actions](references/actions/text.md): `insert`, `replace`, `write`, `highlight`, `delete`,
  `selection`, positioning and typing modes
- [Patch actions](references/actions/patch.md): `applyPatch` with snapshots and patches
- [Snippets](references/snippets.md), [variables](references/variables.md),
  [highlighting](references/highlighting.md), [notes](references/notes.md),
  [tips](references/tips.md)
- Other action groups in [references/actions/](references/actions/index.md): terminal, VS Code,
  settings, preview, interactions, time, Copilot, ...

## 2. Understand the demo

Use the talk plan (`.demo/talk-plan.md`) when there is one. Otherwise find out, one question at a
time and only when the code doesn't tell you:

- Which code: files, a diff, a pull request or a branch. For a diff or PR, the "before" state is the
  base and the "after" state is the head.
- What the presenter wants to explain, in which order, and what the audience should see happen (code
  appearing, a test passing, the app changing, a terminal command).
- How long the demo is, and which parts must be typed live versus appear at once.

Read the code. Don't guess file paths, function names or output.

## 3. Plan the scenes

- One scene is one beat of the story: one click of the presenter. Name it after what the audience
  sees ("Add the /users route"), not after the action.
- Group the moves that belong together in one scene, for example `insert` + `highlight`, or
  `executeTerminalCommand` + `waitForTimeout`.
- Start with a **setup scene** that brings every file to its starting state, so the demo can run
  again and again. End with a scene that shows the result.
- Keep the existing act's file format (JSON or YAML) and naming. A new act gets a numbered name that
  matches the talk, for example `.demo/02-routes.json`, with
  `"$schema": "https://demotime.show/demo-time.schema.json"` and `"version": 3`.

## 4. Make the starting state reproducible

Every file the demo changes needs a known starting point:

- **A new file:** a `create` move in the setup scene with the starting content (often empty).
- **An existing file that changes:** save its "before" version as a snapshot in `.demo/snapshots/`
  (for example `.demo/snapshots/server.ts`) and restore it with a `create` move with
  `"contentPath": ".demo/snapshots/server.ts"`. `create` overwrites the file.
- **Long content** goes in a file with `contentPath`, not in an inline `content` string.

Paths in moves (`path`, `contentPath`, `patch`) are relative to the workspace root.

## 5. Pick the moves

| What happens on stage                       | Move                                            |
| ------------------------------------------- | ----------------------------------------------- |
| Code the presenter types and talks about    | `insert` with `insertTypingMode`                |
| One line at the cursor                      | `write`                                         |
| Change existing code                        | `replace` between placeholders                  |
| A large change that shouldn't be typed live | `applyPatch` (snapshot + patch), or a `snippet` |
| Point at the code being explained           | `highlight`, right after the change             |
| Open a file                                 | `open`                                          |
| Run a command                               | `executeTerminalCommand`                        |
| Show a slide                                | `openSlide`                                     |

- **Typing:** `line-by-line` or `character-by-character` for code the audience should read while it
  appears; `hacker-typer` when the presenter wants to control the pace; `instant` for setup.
- **Highlight** after every change you explain, in the same scene. Highlights clear automatically on
  the next move. Use `zoom` when the code is small on a projector.
- **Patches:** write the snapshot (`.demo/snapshots/<file>`) and the end state, then create the
  patch in `.demo/patches/<name>.patch` as a unified diff, for example
  `diff -u .demo/snapshots/server.ts server.ts > .demo/patches/add-routes.patch` (the file names in
  the `---` and `+++` lines don't matter), or run the `Demo Time: Create a patch` command. Then
  restore the file to its starting state. The `applyPatch` move applies the patch to `contentPath`
  (the snapshot) and writes the result to `path`, so it always starts from the same content.
- **Speaker notes:** give scenes that need explanation a notes file with the talking points:
  `"notes": { "path": ".demo/notes/<scene>.md" }`. The presenter view shows them.

## 6. Use placeholders, not line numbers

Line numbers break as soon as the code changes. Locate code with placeholders by default. Use
`position` only for a fresh file the demo creates itself, where the line numbers are certain.

- `insert`, `replace`, `highlight`, `selection` and `delete` need both `startPlaceholder` and
  `endPlaceholder` (or a `position`).
- `positionCursor` and `write` need only `startPlaceholder`.

How Demo Time finds placeholders:

- A placeholder is plain text, matched exactly, on a **single line**.
- The **first** match in the file wins, so the text must be unique in the file at the moment the
  move runs, including code that earlier moves added.
- `endPlaceholder` is the first match on or after the line of `startPlaceholder`. Choose an end text
  that doesn't occur on the start line itself.
- `insert` puts the content at the start of `startPlaceholder`, before that text. End the content
  with a newline to insert whole lines above it.
- `replace` replaces everything from the start of `startPlaceholder` to the end of `endPlaceholder`.
  Repeat the placeholder text in the new content when it must stay.
- `highlight` covers the whole lines from the start to the end placeholder.

Prefer real code as anchors, such as a function signature or a unique statement. When there is no
unique line, add a short marker comment to the snapshot (for example `// routes`) and remember the
audience sees it.

## 7. Validate

Run the validator from the workspace root. It checks the acts against the schema, and checks that
the referenced files exist, placeholders are found, and scene IDs are unique:

```bash
node <this skill folder>/scripts/validate-act.mjs
node <this skill folder>/scripts/validate-act.mjs .demo/02-routes.json --schema docs/public/demo-time.schema.json
```

The script lives in the `scripts` folder next to this `SKILL.md` and needs Node.js 18 or later. Fix
every error and re-run it. When Node.js isn't available, check the act against the schema yourself
and read every file and placeholder the moves reference.

## 8. Hand over

Summarize the scenes, the files you added (act, snapshots, patches, notes), and how to rehearse:
open the **Demo Time** view and run the scenes in order, or use the play button in the act editor.
Mention that the setup scene resets the demo between rehearsals.
