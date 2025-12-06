# Demo Time Demo Files

This folder contains demonstration files for **Demo Time** using the new **Version 3** theatrical structure.

## 🎭 Theatrical Structure

Demo Time uses an intuitive theatrical metaphor:

- **Play** - Your entire demo project (this workspace)
- **Act** - Each demo file (e.g., `example-v3.yaml` or `my-demo.json`)
- **Scene** - Sections within an Act (previously called "demos")
- **Move** - Individual actions (previously called "steps")

## 📁 Files in This Folder

### Version 3 (New Format)

- **`example-v3.yaml`** - Example demonstration using version 3 theatrical naming
  - Shows the new `scenes` and `moves` structure
  - Demonstrates product icon usage
  - YAML format

### Version 1 & 2 (Legacy Format)

- **`demo.json`** - Legacy JSON format demo
- **`sample.json`** - Sample demo file
- **`sample.yaml`** - Sample YAML demo file
- Other `.json` and `.yaml` files - Various demo examples

## 🚀 Quick Start

### Creating a New Version 3 Demo

Create a file named `my-demo.yaml` (or `my-demo.json`):

```yaml
title: My Demo Act
description: What this Act demonstrates
version: 3
productIcon: presentation
scenes:
  - title: Introduction Scene
    moves:
      - action: showInfoMessage
        message: Hello from Demo Time v3!
```

### Product Icons

Choose from any VS Code codicon:
- `presentation` - General presentations
- `rocket` - Getting started
- `lightbulb` - Features
- `beaker` - Experiments
- `terminal` - CLI demos
- `code` - Coding tutorials

## 📚 Documentation

- **Complete Guide:** `/docs/version-3-guide.md`
- **Migration Guide:** `/MIGRATION-V3.md`
- **Schema:** `https://demotime.show/demo-time.schema.json`

## ✨ Version 3 Features

- ✅ Theatrical naming (Play, Act, Scene, Move)
- ✅ Product icons for visual identification
- ✅ Works with `.json` and `.yaml` files
- ✅ Full backward compatibility with v1 & v2
- ✅ Automatic normalization

## 🔄 Backward Compatibility

All existing `.json` and `.yaml` demo files continue to work without modification. You can mix version 1, 2, and 3 files in the same project.

## 🎬 Example Structure

```yaml
title: Getting Started
version: 3
productIcon: rocket
scenes:
  - title: Installation
    moves:
      - action: create
        path: package.json
        content: {...}
      - action: open
        path: package.json

  - title: First Steps
    moves:
      - action: showInfoMessage
        message: You're all set!
```

## 📖 Learn More

Visit [demotime.show](https://demotime.show/) for complete documentation and examples.
