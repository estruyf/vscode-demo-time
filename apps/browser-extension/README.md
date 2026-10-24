# DemoTime Browser Extension

A browser extension for Microsoft Edge and Google Chrome that allows users to quickly return to their DemoTime slides in Visual Studio Code.

Built with [Extension.JS](https://extension.js.org/) and styled using the official DemoTime design system.

## Features

- **Navigation Page**: Quick access to return to your DemoTime presentation with a single click (previous or next scene)
- **Settings Page**: Configure your DemoTime API URL
- **Scenes Page**: Overview of all scenes from you DemoTime where you can navigate to
- **Cross-browser Support**: Works on both Chrome and Edge


## Development

This extension is built using Extension.JS, a modern cross-browser extension framework.

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm

### Setup

```bash
# Install dependencies
npm install

# Start development mode (auto-reload on changes)
npm run dev

# Build for production
npm run build

# Preview production build
npm start
```

### Available Commands

- `npm run dev` - Start development with Chrome (use `--browser=edge` for Edge)
- `npm run build` - Build extension for production
- `npm start` - Preview the production build

### Development with specific browsers

```bash
# Chrome (default)
npm run dev

# Edge
npm run dev -- --browser=edge
```

## Installation

### For Chrome:
1. Run `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `dist/chrome-mv3-prod` directory

### For Edge:
1. Run `npm run build`
2. Open Edge and go to `edge://extensions/`
3. Enable "Developer mode" in the left sidebar
4. Click "Load unpacked"
5. Select the `dist/chrome-mv3-prod` directory

## Usage

1. Click the DemoTime extension icon in your browser toolbar
2. On first use, click the settings icon (cog) to configure your DemoTime URL
3. Enter a valid URL (http or https) and click "Save"
4. Click the "Next" button to navigate to your DemoTime presentation

## Project Structure

```
demotime-browser-extension/
├── manifest.json           # Extension configuration
├── assets/                 # Logo images
│   ├── demotime.png
│   ├── logo-16.png
│   ├── logo-48.png
│   └── logo-128.png
├── pages/                  # HTML pages
│   ├── navigation.html     # Main navigation page
│   └── settings.html       # Settings page
├── scripts/                # JavaScript files
│   ├── navigation.js       # Navigation logic
│   └── settings.js         # Settings logic
└── styles/                 # CSS files
    ├── common.css          # Shared styles
    ├── navigation.css      # Navigation page styles
    └── settings.css        # Settings page styles
```

