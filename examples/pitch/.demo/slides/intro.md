---
theme: unnamed
layout: intro
---

# Present like a pro: code, demo, and slides — all in VS Code.

Demo Time &mdash; Elio Struyf

---

# What typically goes wrong during sessions?

- Too many distractions:
  - Notifications
  - Applications
  - Hover panels
  - Tabs
- Context switching
- Opening the wrong file, typos, etc.
- Forgetting the next step
- Etc...

---

# Some things can be fixed with settings

```json
{
  // Use a light theme
  "workbench.colorTheme": "GitHub Light Default",
  // Font size
  "editor.fontSize": 20,
  "terminal.integrated.fontSize": 25,
  // Cursor style
  "editor.cursorStyle": "block",
  "editor.cursorBlinking": "expand",
  "workbench.colorCustomizations": {
    "editorCursor.foreground": "#FF0000"
  },
  // Disable hover panels
  "editor.hover.enabled": false
}
```
