# Hacker-Typer Typing Mode

The "hacker-typer" typing mode is a new insertion mode that simulates the behavior of [hackertyper.net](https://hackertyper.net/). When any key is pressed during a demo, it inserts chunks of prewritten code, creating the illusion of super-fast, error-free typing.

## Configuration

### Global Settings

You can configure the hacker-typer mode globally in VS Code settings:

```json
{
  "demoTime.insertTypingMode": "hacker-typer",
  "demoTime.hackerTyperChunkSize": 3
}
```

- `demoTime.insertTypingMode`: Set to `"hacker-typer"` to use this mode by default
- `demoTime.hackerTyperChunkSize`: Number of characters to insert per "keystroke" (default: 3)

### Per-Step Configuration

You can also configure the typing mode for individual demo steps:

```json
{
  "action": "insert",
  "path": "example.js",
  "content": "function hello() { console.log('Hello!'); }",
  "insertTypingMode": "hacker-typer",
  "insertTypingSpeed": 100
}
```

## Available Typing Modes

1. **`instant`** (default) - All text appears immediately
2. **`line-by-line`** - Text appears line by line with delays
3. **`character-by-character`** - Text appears character by character
4. **`hacker-typer`** - Text appears in chunks, simulating fast typing

## How It Works

In hacker-typer mode:
- Content is inserted in configurable chunks (default: 3 characters)
- Each "keystroke" during the demo triggers the next chunk
- Maintains proper cursor positioning and handles multi-line content
- Works with insert, replace, and patch operations

## Example Usage

```json
{
  "title": "Fast Coding Demo",
  "steps": [
    {
      "action": "create",
      "path": "app.js"
    },
    {
      "action": "insert",
      "path": "app.js",
      "content": "const express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.send('Hello World!');\n});\n\napp.listen(3000);",
      "insertTypingMode": "hacker-typer",
      "insertTypingSpeed": 120
    }
  ]
}
```

This will make the code appear to be typed very quickly in chunks, perfect for demonstrations where you want to show coding without actual typing errors or delays.