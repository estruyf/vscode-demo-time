<h1 align="center">
  <img alt="Demo Time" src="./assets/logo/demotime.png">
</h1>

<h2 align="center">Demo Time empowers you to script flawless coding demonstrations and present slides seamlessly within Visual Studio Code. Eliminate typos and missteps, ensuring engaging and stress-free presentations.</h2>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=eliostruyf.vscode-demo-time" title="Check it out on the Visual Studio Marketplace">
    <img src="https://vscode-marketplace-badge.vercel.app/api/badge/version/eliostruyf.vscode-demo-time?style=flat-square" alt="Visual Studio Marketplace" style="display: inline-block" />
  </a>

  <img src="https://vscode-marketplace-badge.vercel.app/api/badge/installs/eliostruyf.vscode-demo-time?style=flat-square" alt="Number of installs"  style="display: inline-block;margin-left:10px" />

  <a href="https://github.com/sponsors/estruyf" title="Become a sponsor" style="margin-left:10px">
    <img src="https://img.shields.io/github/sponsors/estruyf?color=%23CE2E7C&logo=github&style=flat-square" alt="Sponsor the project" style="display: inline-block" />
  </a>
</p>

<h2 align="center">
  <a href="https://demotime.show/" title="Demo Time Documentation">
    Documentation 👉 demotime.show
  </a>
</h2>

<p align="center">
  <img alt="Demo Time" src="./assets/demotime.gif">
</p>

## Features

- **Scripted Demos**: Automate your coding demonstrations to maintain a perfect flow.​
- **Code Highlighting**: Emphasize specific code segments to draw audience attention.​
- **Integrated Slides**: Present slides directly within VS Code for a cohesive experience.​
- **Customizable Actions**: Execute various VS Code commands and tasks as part of your demo.
- **PowerPoint Integration**: Seamlessly move from slides to code using the
  [PowerPoint integration](https://demotime.show/integrations/powerpoint/).
- **Companion Desktop App**: Use the [Demo Time Companion](./apps/companion-app/) desktop app for screen overlays, blur effects, spotlight mode, zoom, and message displays during your presentations.

## Getting Started

1. **Installation**: Install the extension.​
2. **Initialization**: After installation, initialize the extension in your project by opening the
   Explorer panel in VS Code. Locate the **Demo Time** view and click on the "**Initialize**"
   button. This action creates a `.demo` folder in your workspace containing either a `demo.json` or
   `demo.yaml` file, depending on your chosen format.​
3. **Creating Demos**: Populate the demo file with your actions, defining each step and action as
   required.​ More information about the available actions can be found in the
   [supported actions](https://demotime.show/actions/) documentation section.

## Documentation

For detailed instructions, advanced configurations, and best practices, please refer to the
comprehensive documentation available at [https://demotime.show](https://demotime.show). This
resource offers in-depth guides and examples to help you maximize the extension's capabilities.

## Example demo file

Here is an example demo:

```json
{
  "$schema": "https://demotime.show/demo-time.schema.json",
  "title": "Sample demo",
  "description": "This is a sample demo configuration to show the capabilities of the extension.",
  "demos": [
    {
      "title": "Step 1",
      "description": "This is step 1",
      "steps": [
        {
          "action": "create",
          "path": "sample.json",
          "content": "{\n  \"firstName\": \"Elio\",\n  \"lastName\": \"Struyf\"\n}"
        },
        {
          "action": "open",
          "path": "sample.json"
        },
        {
          "action": "highlight",
          "path": "sample.json",
          "position": "2:3"
        }
      ]
    },
    {
      "title": "Step 2",
      "description": "This is step 2",
      "steps": [
        {
          "action": "snippet",
          "contentPath": "./snippets/insert_and_highlight.json",
          "args": {
            "MAIN_FILE": "sample.json",
            "CONTENT_PATH": "content.txt",
            "CONTENT_POSITION": "3",
            "HIGHLIGHT_POSITION": "4"
          }
        }
      ]
    }
  ]
}
```

You can also explore a comprehensive example in the following GitHub Repositories:

- [Introduction presentation about Demo Time](https://github.com/estruyf/demo-time-presentation)
- [presentation-github-actions](https://github.com/estruyf/presentation-github-actions)
- [presentation-m365-playwright-github-actions](https://github.com/estruyf/presentation-m365-playwright-github-actions)

## Demo Time Companion App

The **Demo Time Companion** is a desktop application that enhances your presentations with screen overlays and effects:

- 🌫️ **Blur Overlay**: Temporarily blur the screen during transitions
- 🔦 **Spotlight Mode**: Highlight specific areas by dimming everything else
- 🔍 **Zoom In/Out**: Smooth zoom functionality for detailed views
- 💬 **Message Overlay**: Display custom messages on screen
- ⌨️ **Keyboard Shortcuts**: Global shortcuts for all actions
- 🔌 **HTTP API**: Control from VS Code or any application

### Quick Start

```bash
# Build the companion app
cd apps/companion-app
yarn install
yarn tauri:build

# Run in development
yarn tauri:dev
```

The app starts an HTTP API on `http://127.0.0.1:42042` that you can call from your demos:

```bash
# Toggle blur overlay
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "blur.toggle"}'

# Show a message
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "message.show", "params": {"text": "Switching to slides..."}}'
```

For full documentation, see [apps/companion-app/README.md](./apps/companion-app/README.md) and [apps/companion-app/INTEGRATION.md](./apps/companion-app/INTEGRATION.md).

## Testing

Run linting and unit tests with:

```bash
npm run lint
npm test
```

Tests use [Jest](https://jestjs.io/) with built-in coverage. New tests are located in the `tests/`
directory.

## Support

If you enjoy my work and find them useful, consider sponsor me and the ecosystem to help Open Source
sustainable. Thank you!

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for
details.

<p align="center">
  <a href="https://github.com/sponsors/estruyf" title="Sponsor Elio Struyf" target="_blank">
    <img src="https://img.shields.io/badge/Sponsor-Elio%20Struyf%20%E2%9D%A4-%23fe8e86?logo=GitHub&style=flat-square" height="25px" alt="Sponsor @estruyf" />
  </a>
</p>

<br />

<p align="center">
  <a href="https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time">
    <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time&labelColor=%23555555&countColor=%2397ca00" height="25px" alt="Demo Time visitors" />
  </a>
</p>

<br />

<p align="center">
  <a href="https://struyfconsulting.com" title="Hire Elio Struyf via Struyf Consulting" target="_blank">
    <img src="./assets/struyf-consulting.webp" height="25px" alt="Struyf Consulting Logo" />
  </a>
</p>
