# Migration Guide: Demo Time Version 3

## Overview

This guide helps you migrate from Demo Time Version 1 or 2 to Version 3, which introduces theatrical naming conventions for better clarity and organization.

## What's Changed?

### Terminology

| Concept | v1 & v2 | v3 | Description |
|---------|---------|-----|-------------|
| **Project** | Project | **Play** | Your entire demo project |
| **Demo File** | `.json`, `.yaml` | **Act** (`.json`, `.yaml`) | Individual demo files |
| **Demo Section** | `demos` | **scenes** | Sections within an Act |
| **Action Step** | `steps` | **moves** | Individual actions |

### File Format Changes

**Version 3 introduces:**
- Uses existing file extensions: `.json` or `.yaml`
- Required `version: 3` field
- Optional `productIcon` field for visual identification
- `scenes` replaces `demos`
- `moves` replaces `steps`

## Do You Need to Migrate?

**No!** Version 3 is fully backward compatible.

- ✅ Existing v1 and v2 files continue to work
- ✅ No breaking changes to your current demos
- ✅ You can mix v1, v2, and v3 files in the same project
- ✅ Migrate only when you're ready

## Migration Approaches

### Approach 1: Gradual Migration (Recommended)

Create new demos using v3 format while keeping existing demos unchanged.

**Benefits:**
- No disruption to existing demos
- Learn v3 gradually
- Low risk

**Steps:**
1. Keep existing `.json` and `.yaml` files as-is
2. Create new demos using v3 format in `.json` or `.yaml` files
3. Gradually convert old demos as needed

### Approach 2: Full Migration

Convert all existing demos to v3 format.

**Benefits:**
- Consistent structure across all demos
- Modern naming conventions throughout
- Full use of v3 features

**Steps:**
1. Back up your `.demo` folder
2. Convert each demo file following the guide below
3. Test thoroughly

## Step-by-Step Conversion

### Step 1: Update Version and Add Product Icon

**Before:**
```yaml
title: My Demo
description: Demo description
version: 2
```

**After:**
```yaml
title: My Demo
description: Demo description
version: 3
productIcon: presentation  # Add this (optional but recommended)
```

**Available Product Icons:**
- `presentation` - General presentations
- `rocket` - Getting started demos
- `beaker` - Experiments and testing
- `lightbulb` - Feature showcases
- `terminal` - CLI demonstrations
- `code` - Coding tutorials
- `book` - Documentation walkthroughs
- Any valid VS Code codicon

### Step 2: Rename `demos` to `scenes`

**Before:**
```yaml
demos:
  - title: First Demo
    description: Description here
```

**After:**
```yaml
scenes:
  - title: First Scene
    description: Description here
```

### Step 3: Rename `steps` to `moves`

**Before:**
```yaml
scenes:
  - title: First Scene
    steps:
      - action: create
        path: file.txt
```

**After:**
```yaml
scenes:
  - title: First Scene
    moves:
      - action: create
        path: file.txt
```

### Step 4: Schema Reference (Optional)

For YAML files, the `$schema` reference is optional but can be kept for IDE autocomplete support.

## Complete Example

### Version 2 File (demo.yaml)

```yaml
$schema: https://demotime.show/demo-time.schema.json
title: Getting Started
description: Introduction to the project
version: 2
timer: 10
demos:
  - id: intro
    title: Introduction
    description: Welcome message
    steps:
      - action: create
        path: README.md
        content: |
          # Welcome
          This is the introduction.
      - action: open
        path: README.md
      - action: showInfoMessage
        message: Welcome to the demo!

  - id: features
    title: Feature Demo
    description: Show key features
    steps:
      - action: create
        path: features.ts
        content: |
          export const features = ['feature1', 'feature2'];
      - action: open
        path: features.ts
```

### Version 3 File (demo.yaml)

```yaml
title: Getting Started
description: Introduction to the project
version: 3
productIcon: rocket
timer: 10
scenes:
  - id: intro
    title: Introduction
    description: Welcome message
    moves:
      - action: create
        path: README.md
        content: |
          # Welcome
          This is the introduction.
      - action: open
        path: README.md
      - action: showInfoMessage
        message: Welcome to the demo!

  - id: features
    title: Feature Demo
    description: Show key features
    moves:
      - action: create
        path: features.ts
        content: |
          export const features = ['feature1', 'feature2'];
      - action: open
        path: features.ts
```

### Changes Summary

1. ✅ Version: `2` → `3`
2. ✅ Added: `productIcon: rocket` (optional but recommended)
3. ✅ Renamed: `demos` → `scenes`
4. ✅ Renamed: `steps` → `moves`

## Automated Migration Script

While there's no automated tool yet, here's a manual checklist:

- [ ] Backup `.demo` folder
- [ ] For each demo file:
  - [ ] Change `version: 2` to `version: 3`
  - [ ] Add `productIcon: <icon-name>` (optional but recommended)
  - [ ] Replace `demos:` with `scenes:`
  - [ ] Replace `steps:` with `moves:`
  - [ ] Test the demo

## Validation

After migration, validate your files:

1. **Schema Validation**
   - Version 3 files are validated against the updated schema
   - Required fields: `version`, `scenes`, `productIcon`
   - Each scene must have `moves` (not `steps`)

2. **Runtime Testing**
   - Run each migrated demo
   - Verify all moves execute correctly
   - Check that icons display properly

## Troubleshooting

### "Invalid property 'demos'" error

**Problem:** Using `demos` in a version 3 file.

**Solution:** Change `demos:` to `scenes:` in version 3 files.

### "Invalid property 'steps'" error

**Problem:** Using `steps` in a version 3 scene.

**Solution:** Change `steps:` to `moves:` in version 3 scenes.

### Missing product icon

**Note:** The `productIcon` field is optional but recommended for visual identification.

**Solution:** Add `productIcon: <icon-name>` to your version 3 file if desired.

### Demo doesn't run

**Problem:** Syntax error after migration.

**Solution:**
1. Check that version is set to `3`
2. Ensure `scenes` is used instead of `demos`
3. Ensure `moves` is used instead of `steps`
4. Verify YAML syntax is correct

## Rollback

If you need to rollback:

1. Restore from backup
2. Or manually revert:
   - Change `version: 3` to `version: 2`
   - Rename `scenes` to `demos`
   - Rename `moves` to `steps`
   - Remove `productIcon` field (if added)

## Best Practices

### 1. Start with New Demos

Create new demos using v3 to learn the structure before migrating existing ones.

### 2. Use Meaningful Product Icons

Choose icons that represent the content:
- 🚀 `rocket` - Getting started guides
- 💡 `lightbulb` - Feature demonstrations
- 🧪 `beaker` - Experimental features
- 📚 `book` - Documentation
- ⚙️ `gear` - Configuration
- 🖥️ `terminal` - CLI tools

### 3. Update Descriptions

Take the opportunity to improve demo descriptions when migrating.

### 4. Test Thoroughly

Always test demos after migration to ensure everything works correctly.

### 5. Keep Backups

Maintain backups of your original demo files until you've verified the migration.

## Getting Help

- **Documentation:** See `docs/version-3-guide.md` for complete v3 reference
- **Example:** Check `.demo/example-v3.act` for a working example
- **Issues:** Report problems on the GitHub repository

## Summary

Version 3 migration checklist:

- [ ] Understand the new theatrical naming conventions
- [ ] Decide on migration approach (gradual vs. full)
- [ ] Back up existing demo files
- [ ] Convert files following the step-by-step guide
- [ ] Test all migrated demos
- [ ] Update documentation if needed
- [ ] Enjoy the improved clarity of v3! 🎭

---

**Remember:** Migration is optional. Version 3 is designed for clarity and better organization, but your existing demos will continue to work perfectly!
