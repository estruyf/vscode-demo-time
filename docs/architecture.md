# Demo Time Architecture

## Overview

Demo Time is a Visual Studio Code extension that enables users to script, present, and automate live
coding demos and slides directly within VS Code. The extension is designed for modularity,
maintainability, and ease of use, supporting both demo step automation and slide-based
presentations.

## Main Components

### 1. Extension Core (`src/extension.ts`)

- Entry point for the extension.
- Registers commands, sets up configuration, and initializes services.

### 2. Models (`src/models/`)

- TypeScript interfaces and classes for demo steps, slides, actions, themes, and metadata.
- Ensures type safety and clear data structures throughout the extension.

### 3. Services (`src/services/`)

- Business logic and core functionality (e.g., running demos, managing state, file operations, API
  integration).
- Decouples logic from UI and command registration.

### 4. Panels & Views

- **Demo Panel (`src/panels/DemoPanel.ts`)**: Main tree view for managing and running demos.
- **Presenter View (`src/presenterView/`)**: React-based webview for speaker notes and presentation
  controls.
- **Preview View (`src/preview/`)**: React-based webview for slide previews and live rendering.

### 5. Webview Assets (`assets/`, `src/presenterView/`, `src/preview/`)

- Custom React components, styles, and icons for webviews.
- Webpack and tsup are used for bundling and optimizing assets.

### 6. Utilities (`src/utils/`)

- Helper functions for file operations, parsing, formatting, and more.

### 7. Configuration & Schema

- User/workspace settings are defined in `package.json` under `contributes.configuration`.
- JSON schema for demo and slide files is provided for validation and IntelliSense.

## Data Flow

- User triggers a command (e.g., start demo, next step) via UI or command palette.
- The extension core delegates the action to the appropriate service.
- Services update state, interact with files, or communicate with webviews as needed.
- Webviews (React apps) receive updates via VS Code's messaging API and update the UI.

## Key Design Decisions

- **TypeScript** is used throughout for type safety and maintainability.
- **React** is used for complex webview UIs (presenter and preview views).
- **Separation of concerns**: Models, services, and UI are kept modular.
- **Extensibility**: New actions, themes, and components can be added with minimal changes to the
  core.
- **Testing**: Unit and integration tests are supported via Mocha and vscode-test.

## Build & Tooling

- **Webpack** and **tsup** are used for bundling extension and webview code.
- **ESLint** and **Prettier** enforce code quality and style.
- **GitHub Actions** is used for CI (lint, test, build, release).

## Folder Structure (Summary)

- `src/` — Extension source code (core, models, services, panels, views, utils)
- `assets/` — Images, icons, fonts, and static assets
- `scripts/` — Build and asset management scripts
- `docs/` — Code documentation like this file, all other documentation can be found here:
  [demotime.elio.dev](https://demotime.elio.dev)

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

For questions or suggestions, please open an issue or see the [CONTRIBUTING.md](../CONTRIBUTING.md).
