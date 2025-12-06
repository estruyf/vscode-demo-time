# Demo Time Version 3: Theatrical Naming Conventions

## Overview

Demo Time Version 3 introduces a new theatrical structure that makes complex demos easier to understand, create, and present. The new naming conventions mirror how presenters naturally tell stories and organize their presentations.

## The Theatrical Structure

### Play

**What it is:** Your entire demo project.

A Play represents everything you want to present. One Play can contain multiple Acts, giving you the flexibility to structure large or multi-part demonstrations.

**Example:** A conference presentation about a new web framework might be one Play.

---

### Act

**What it is:** A demo file in your project.

Each Act represents a single demo file (with the `.act` extension for version 3). Acts focus on specific topics or parts of your overall story. You can have as many Acts as you need, each with its own flow and purpose.

**Version 3 Requirements:**
- Must use `version: 3` in the file
- Requires a `productIcon` field for visual identification
- Uses YAML format with `.act` extension
- Contains `scenes` instead of `demos`

**Example:** An Act named `getting-started.act` might cover installation and setup.

---

### Scene

**What it is:** A single demo inside an Act.

Scenes let you break an Act into digestible sections, each showcasing a specific feature, workflow, or idea. In version 1 and 2, these were called "demos."

**Version 3 Changes:**
- Replaces the `demos` property
- Uses `moves` instead of `steps`
- Otherwise identical structure to legacy demos

**Example:** A Scene titled "Installation" within the "Getting Started" Act.

---

### Move

**What it is:** One step inside a Scene.

Moves execute in order and perform clear actions such as:
- Showing text
- Highlighting code
- Running commands
- Switching tools
- Opening files
- Executing terminal commands

Together, Moves build the narrative of your Scene.

**Version 3 Changes:**
- Replaces the `steps` property
- Same structure and capabilities as legacy steps
- All existing action types remain supported

**Example:** A Move that creates a file, another that highlights a code block, and a third that runs a terminal command.

---

## Version 3 File Format

### Basic Structure

```yaml
title: My Demo Act
description: Description of this Act
version: 3
productIcon: presentation
timer: 15
scenes:
  - id: scene-1
    title: Scene Title
    description: What this scene demonstrates
    moves:
      - action: create
        path: example.ts
        content: |
          console.log('Hello from Demo Time v3!');
      - action: open
        path: example.ts
```

### Required Fields

For Version 3 (`.act` files):
- `version: 3` - Must be set to 3
- `productIcon` - Visual identifier for the Act
- `scenes` - Array of scenes (replaces `demos`)
- Each scene must have `moves` (replaces `steps`)

### Product Icons

The `productIcon` field helps visually identify different Acts in your project. Use any valid VS Code codicon name:

- `presentation`
- `book`
- `rocket`
- `lightbulb`
- `beaker`
- `terminal`
- `code`
- etc.

---

## Migration from Version 1 & 2

### Terminology Mapping

| Version 1 & 2 | Version 3 | Description |
|---------------|-----------|-------------|
| Demo file (`.json`, `.yaml`) | Act (`.act`) | The demo file itself |
| `demos` | `scenes` | Array of demo sections |
| `steps` | `moves` | Individual actions |

### Automatic Normalization

Demo Time v3 includes automatic normalization:
- Version 3 files are automatically converted internally to work with existing code
- Version 1 & 2 files continue to work without modification
- All existing actions and features are fully supported

### Converting a Version 2 File to Version 3

**Before (demo.yaml - Version 2):**
```yaml
title: My Demo
description: Demo description
version: 2
demos:
  - title: First Demo
    steps:
      - action: create
        path: file.txt
        content: Hello
```

**After (demo.act - Version 3):**
```yaml
title: My Demo
description: Demo description
version: 3
productIcon: presentation
scenes:
  - title: First Scene
    moves:
      - action: create
        path: file.txt
        content: Hello
```

---

## Benefits of the New Structure

### 1. Intuitive Mental Model
The theatrical metaphor (Play → Act → Scene → Move) mirrors how presenters naturally think about their demonstrations.

### 2. Easier Planning
The hierarchical structure makes it easier to plan and organize complex multi-part demos.

### 3. Predictable Organization
The consistent naming helps teams understand demo structure at a glance.

### 4. Natural Storytelling
The theatrical terminology encourages thinking about demos as narratives with a beginning, middle, and end.

---

## Backward Compatibility

- **Version 1 & 2 files** (`.json`, `.yaml`) continue to work without changes
- **Existing demos** don't need to be migrated
- **New features** are available in version 3 but don't break older versions
- **Mixed versions** can coexist in the same project

---

## Best Practices

### 1. Use Descriptive Names
Give your Scenes and Moves clear, descriptive titles that explain what they demonstrate.

### 2. Choose Meaningful Product Icons
Select product icons that represent the content or purpose of each Act.

### 3. Group Related Content
Organize related demonstrations into the same Act with multiple Scenes.

### 4. Keep Moves Focused
Each Move should perform one clear action. Break complex operations into multiple Moves.

### 5. Add Descriptions
Use the `description` field to document what each Scene accomplishes.

---

## Example: Complete Act Structure

```yaml
title: Getting Started with Demo Time
description: A comprehensive introduction to Demo Time v3
version: 3
productIcon: rocket
timer: 20

scenes:
  - id: intro
    title: Welcome Scene
    description: Introduce Demo Time and its purpose
    icons:
      start: play-circle
      end: check-circle
    moves:
      - action: create
        path: README.md
        content: |
          # Demo Time v3
          Welcome to the new theatrical structure!
      - action: open
        path: README.md
      - action: showInfoMessage
        message: Welcome to Demo Time v3!

  - id: features
    title: Feature Showcase
    description: Demonstrate key features
    moves:
      - action: create
        path: features.ts
        content: |
          export const features = {
            plays: 'Entire demo project',
            acts: 'Demo files',
            scenes: 'Demo sections',
            moves: 'Individual actions'
          };
      - action: open
        path: features.ts
      - action: highlight
        path: features.ts
        position: "2:1:6:3"

  - id: conclusion
    title: Closing Scene
    description: Wrap up and thank the audience
    moves:
      - action: showInfoMessage
        message: Thank you for learning about Demo Time v3!
      - action: closeAll
```

---

## Schema Validation

Version 3 files use the same schema URL with enhanced validation:

```yaml
# Optional but recommended for IDE autocomplete
$schema: https://demotime.show/demo-time.schema.json
```

The schema automatically validates:
- Required fields for version 3
- Proper use of `scenes` vs `demos`
- Proper use of `moves` vs `steps`
- Required `productIcon` for `.act` files

---

## Summary

Demo Time Version 3 introduces:
- ✅ **Theatrical naming**: Play, Act, Scene, Move
- ✅ **Version 3 format**: `version: 3` with `scenes` and `moves`
- ✅ **Product icons**: Visual identification for Acts
- ✅ **`.act` files**: YAML-based Act files
- ✅ **Backward compatibility**: Version 1 & 2 files work unchanged
- ✅ **Automatic normalization**: Seamless internal conversion

Start using version 3 today by creating `.act` files with the new theatrical structure!
