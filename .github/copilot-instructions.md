# Copilot Instructions for vscode-demo-time

## Project Overview

- **Purpose:** Script, automate, and present coding demos and slides inside Visual Studio Code. Used
  for live presentations, workshops, and technical walkthroughs.
- **Core Concept:** Demos are defined in `.demo/demo.json` or `.demo/demo.yaml` files. Each demo
  contains steps (actions) that automate editor operations, code highlighting, slide presentation,
  and more.
- **Major Components:**
  - `src/services/`: Core logic for demo execution, file manipulation, slide parsing, and
    integration with VS Code APIs.
  - `src/panels/`: Webview panels for UI (e.g., slides, welcome, presenter view).
  - `src/models/`: TypeScript types for demos, steps, actions, and configuration.
  - `src/utils/`: Utility functions for file operations, patching, and action templates.
  - `snippets/`: Reusable demo step templates (see `snippets/README.md`).

## Key Patterns & Conventions

- **Demo File Format:**
  - JSON or YAML, with a schema at the top-level (`$schema`).
  - `demos` is an array; each demo has `title`, `description`, `steps`, and optional `icons`.
  - Steps use a defined set of actions (see `src/utils/getActionOptions.ts`).
- **Actions:**
  - Each step's `action` field maps to a handler in `src/services/`.
  - Common actions: `insert`, `highlight`, `openSlide`, `setTheme`, `snippet`, etc.
  - Snippet actions reference files in `snippets/` and support argument substitution.
- **Initialization:**
  - Run the "Initialize" command from the Demo Time view to scaffold `.demo/` and default demo
    files.
- **Testing:**
  - Unit tests use Jest (`npm test`).
  - For extension/VS Code API tests, use `@vscode/test-cli` and Mocha (see README for details).
- **PowerPoint Integration:**
  - Supported via dedicated add-in (see docs and `apps/powerpoint-addin/`).

## Developer Workflows

- **Build:** Standard Node.js/TypeScript build (`npm install`, `npm run build`).
- **Lint/Test:** `npm run lint` and `npm test`.
- **Extension Packaging:** Use VSCE or `npm run package` (if configured).
- **Debugging:** Launch the extension in a VS Code Extension Development Host.
- **Adding Actions:**
  - Define new actions in `src/models/Action.ts` and add handling logic in `src/services/`.
  - Update `src/utils/getActionOptions.ts` and `src/utils/getActionTemplate.ts` for UI integration.

## Integration & Data Flow

- **Demo execution** flows from the demo file → parsed by services → actions dispatched to VS
  Code/editor APIs.
- **Panels** (webviews) communicate with the extension via message passing (see `WebViewMessages` in
  `constants`).
- **Snippets** are loaded and parameterized at runtime for reusable demo logic.

## Examples

- See `README.md` for a full demo file example.
- See `snippets/README.md` for snippet usage and configuration.

---

For more, see [https://demotime.show](https://demotime.show) and the in-repo documentation. If you
add new actions or demo file features, update the schema and documentation accordingly.
