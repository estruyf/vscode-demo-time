# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Demo Time is a VS Code extension for scripting and presenting live coding demos and slides
(https://demotime.show). It is an Nx monorepo (Yarn 4 workspaces, Node 24).

| Path                    | What it is                                                      |
| ----------------------- | --------------------------------------------------------------- |
| `apps/vscode-extension` | The extension (`src/services`, `src/utils`, `src/panels`, ...)  |
| `apps/webviews`         | React/Vite webviews (act editor, settings, presenter view, ...) |
| `packages/common`       | Shared models and utils (`@demotime/common`), incl. `Action.ts` |
| `apps/video`            | `@demotime/video` CLI for exporting a play as video             |
| `apps/mcp`              | `@demotime/mcp` MCP server (documentation search)               |
| `apps/pwa`              | Remote control PWA                                              |
| `apps/powerpoint-addin` | PowerPoint add-in                                               |
| `docs`                  | Astro/Starlight documentation site (demotime.show)              |

User-facing terminology is **Play / Act / Scene / Move**. Older code still uses Demo / Step / Action
names internally; use the new terms in docs, UI text and changelog entries.

## Commands

```bash
yarn install
npm run vscode:dev      # watch extension + webviews + common
npm run vscode:build    # build the extension
npm run docs:dev        # run the docs site
npm run lint            # lint all projects
npm test                # jest tests for all projects
npx nx format:check     # prettier check (runs in CI)
```

Tests live in `apps/vscode-extension/tests` and `apps/video/tests`. Formatting follows
`.prettierrc.json` (single quotes, 100 chars, trailing commas).

## Required for every change

### 1. Changelog entry

Every feature, fix or change needs an entry in the root [CHANGELOG.md](CHANGELOG.md), in the topmost
(unreleased) version section, e.g. `## [2.4.0] - 2026-xx-xx`.

- Link the GitHub issue when there is one:
  `- [#123](https://github.com/estruyf/vscode-demo-time/issues/123): Added the ...`
- Use `/pull/123` instead of `/issues/123` when the entry references a PR.
- No issue? Add a plain bullet without a link. If you are unsure whether an issue exists, ask.
- Start with a verb (`Added`, `Fix`, `Allow`, ...) and name settings, actions and commands in
  backticks.
- Only edit the root `CHANGELOG.md`. `apps/vscode-extension/CHANGELOG.md` and `docs/changelog.md`
  are generated from it by `scripts/copy-changelog.cjs` and `docs/scripts/update-changelog.cjs`.

### 2. Documentation check

When adding or changing a feature, check that the docs still match the behavior and update them in
the same change:

- `docs/src/content/docs/` — `actions/`, `features/`, `slides/`, `references/settings.mdx`,
  `references/commands.mdx`, `references/json-schema.mdx`, and any page that mentions the feature
- `docs/public/demo-time.schema.json` — act file JSON schema (actions and their properties)
- `apps/vscode-extension/package.json` `contributes` — commands and settings with descriptions
- `README.md` files of the affected app or package

Search the docs for the feature, setting or action name to find every page that refers to it.

## Adding a new action

The release workflows (`release.yml`, `release-beta.yml`) run `.github/scripts/verify-actions.mjs`,
which fails when any value in the `Action` enum (`packages/common/src/models/Action.ts`) is missing
from `apps/vscode-extension/src/utils/getActionOptions.ts` or
`apps/vscode-extension/src/utils/getActionTemplate.ts`. A new action must be added to **both**
files.

Full checklist (also in [NEW_ACTION_STEPS.md](NEW_ACTION_STEPS.md)):

1. Add the action to `packages/common/src/models/Action.ts`
2. Implement and register it in `apps/vscode-extension/src/services/DemoRunner.ts`
3. Add a template in `apps/vscode-extension/src/utils/getActionTemplate.ts`
4. Add an option in `apps/vscode-extension/src/utils/getActionOptions.ts`
5. Add it to `CATEGORIZED_ACTIONS` in `apps/webviews/src/types/demo.ts`
6. Register its icon, required fields and optional fields in
   `apps/webviews/src/utils/actionHelpers.ts` (custom field rendering goes in
   `apps/webviews/src/components/step/StepEditor.tsx`)
7. Add it to `docs/public/demo-time.schema.json`, with its properties in the `allOf` section
8. Document it in `docs/src/content/docs/actions/`
9. Add the changelog entry

Verify locally before finishing:

```bash
GITHUB_STEP_SUMMARY=$(mktemp) node .github/scripts/verify-actions.mjs && echo OK
```

## Git

Work happens on `dev`; feature branches (`feature/...`, `issue/...`) are created from and merged
back into `dev`. `main` is for releases.

When working on a GitHub issue, ask whether to create an `issue/<number>` branch before starting;
the default is no, so work on the current branch unless the user says otherwise. Start every commit
message with the issue ID: `#428 - Fix the ...`. A PR description links the issue with `Fixes #428`.

Some words in a commit message trigger publish workflows when pushed: `#release` (extension beta),
`#video` (`@demotime/video`), `#mcp`, `#pwa` and `#powerpoint`. Only add them when asked.
