<h1 align="center">
  <img alt="Demo Time" src="./assets/demo-time-128x128.png">
</h1>

<h2 align="center">Unlock a new dimension in presenting coding demos – effortlessly click through them as if they were presentation slides, thanks to this cutting-edge VSCode extension.</h2>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=eliostruyf.vscode-demo-time" title="Check it out on the Visual Studio Marketplace">
    <img src="https://vscode-marketplace-badge.vercel.app/api/badge/version/eliostruyf.vscode-demo-time?style=flat-square" alt="Visual Studio Marketplace" style="display: inline-block" />
  </a>

  <img src="https://vscode-marketplace-badge.vercel.app/api/badge/installs/eliostruyf.vscode-demo-time?style=flat-square" alt="Number of installs"  style="display: inline-block;margin-left:10px" />

  <a href="https://github.com/sponsors/estruyf" title="Become a sponsor" style="margin-left:10px">
    <img src="https://img.shields.io/github/sponsors/estruyf?color=%23CE2E7C&logo=github&style=flat-square" alt="Sponsor the project" style="display: inline-block" />
  </a>
</p>

<p align="center">
  <img alt="Demo Time" src="./assets/demotime.gif">
</p>

## Features

Currently, the extension supports the following features:

- Multiple demo files located in the `.demo` folder.
- Support for code/snippet files in the `.demo` folder, allowing you to define multiple reusable steps.
- Explorer panel to execute your demo steps (you can move it to the activity bar).
- Run through the demo steps by executing the `Demo Time: Start` command.
- Presentation mode that allows you to use a **clicker** to navigate through the demo steps.
- Run a specific demo step from a command execution using the `demo-time.runById` command.
- Place your variables in a `variables.json` file in the `.demo` folder and reference them like `{variable_name}` in your demo steps.

## Usage

To use the extension, you need to create a `.demo` folder in your workspace. Once created, you can add a JSON file which contains the demo and its steps.

```json
{
  "$schema": "https://elio.dev/demo-time.schema.json",
  "title": "<title>",
  "description": "<description>",
  "demos": []
}
```

Add your demos to the `demos` array. Each demo can consist of multiple steps.

```json
{
  "title": "<title>",
  "description": "<description>",
  "steps": []
}
```

## Demo steps

### File actions

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>create</code>
    </td>
    <td>
      Create a new file
    </td>
    <td>

```json
{
  "action": "create",
  "path": "<relative path to the file>",
  "content": "<content of the file> (optional)",
  "contentPath": "<relative path to the file in the .demo folder> (optional)"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>open</code>
    </td>
    <td>
      Open a file
    </td>
    <td>

```json
{
  "action": "open",
  "path": "<relative path to the file>"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>markdownPreview</code>
    </td>
    <td>
      Preview a Markdown file
    </td>
    <td>

```json
{
  "action": "markdownPreview",
  "path": "<relative path to the file>"
}
```

  </td>
  </tr>
</table>

### Code actions

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>insert</code>
    </td>
    <td>
      Insert code into a file
    </td>
    <td>

```json
{
  "action": "insert",
  "path": "<relative path to the file>",
  "position": "<line number> or <start line number>:<end line number>",
  "content": "<content of the file> (optional)",
  "contentPath": "<relative path to the file in the .demo folder> (optional)",
  "lineInsertionDelay": "<delay in milliseconds to insert each line> (optional)"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>replace</code>
    </td>
    <td>
      Replace code in a file
    </td>
    <td>

```json
{
  "action": "replace",
  "path": "<relative path to the file>",
  "position": "<line number> or <start line number>:<end line number>",
  "content": "<content of the file> (optional)",
  "contentPath": "<relative path to the file in the .demo folder> (optional)",
  "lineInsertionDelay": "<delay in milliseconds to insert each line> (optional)"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>delete</code>
    </td>
    <td>
      Delete code from a file
    </td>
    <td>

```json
{
  "action": "delete",
  "path": "<relative path to the file>",
  "position": "<line number> or <start line number>:<end line number>"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>highlight</code>
    </td>
    <td>
      Highlight code in a file. You can change the border color with the

`demoTime.highlightBorderColor` setting.
    </td>
    <td>

```json
{
  "action": "highlight",
  "path": "<relative path to the file>",
  "position": "<line number> or <start line number>:<end line number>"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>unselect</code>
    </td>
    <td>
      Unselect code in a file
    </td>
    <td>

```json
{
  "action": "unselect",
  "path": "<relative path to the file>"
}
```

  </td>
  </tr>
</table>

### Setting actions

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>setSetting</code>
    </td>
    <td>
      Update a setting in Visual Studio Code
    </td>
    <td>

```json
{
  "action": "setSetting",
  "setting": {
    "key": "<setting key>",
    "value": "<value>"
  }
}
```

  </td>
  </tr>
</table>

#### Setting update example

Here is an example of how you can hide the activity and status bar in Visual Studio Code.

```json
{
  "action": "setSetting",
  "args": {
    "setting": "workbench.statusBar.visible",
    "value": false
  }
}, 
{
  "action": "setSetting",
  "args": {
    "setting": "workbench.activityBar.location",
    "value": "hidden"
  }
}
```

To reset the settings, you can use the following steps:

```json
{
  "action": "setSetting",
  "setting": {
    "key": "workbench.statusBar.visible",
    "value": null
  }
}, 
{
  "action": "setSetting",
  "setting": {
    "key": "workbench.activityBar.location",
    "value": null
  }
}
```

### Time actions

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>waitForTimeout</code>
    </td>
    <td>
      Wait for a specific amount of time
    </td>
    <td>

```json
{
  "action": "waitForTimeout",
  "timeout": "<timeout in milliseconds>"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>waitForInput</code>
    </td>
    <td>
      Wait until the user presses a key
    </td>
    <td>

```json
{
  "action": "waitForInput"
}
```

  </td>
  </tr>
</table>

### VS Code actions

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>executeVSCodeCommand</code>
    </td>
    <td>
      Execute a VSCode command
    </td>
    <td>

```json
{
  "action": "executeVSCodeCommand",
  "command": "<command to execute>",
  "args": "<arguments to pass to the command (optional)>",
  "path": "<relative path to the file (optional, when defined, the args property is ignored.)>"
}
```

  </td>
  </tr>
  <tr>
    <td>
      <code>showInfoMessage</code>
    </td>
    <td>
      Show a notification in Visual Studio Code
    </td>
    <td>

```json
{
  "action": "showInfoMessage",
  "message": "<message>"
}
```

  </td>
  </tr>
</table>

### Terminal actions

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>executeTerminalCommand</code>
    </td>
    <td>
      Execute a command in the terminal
    </td>
    <td>

```json
{
  "action": "executeTerminalCommand",
  "command": "<command to execute>"
}
```

  </td>
  </tr>
</table>

### Snippets

<table>
  <tr>
    <th>Action</th>
    <th>Description</td>
    <th>Usage</td>
  </tr>
  <tr>
    <td>
      <code>snippet</code>
    </td>
    <td>
      Use a snippet in which you can define multiple reusable steps
    </td>
    <td>

```jsonc
{
  "action": "snippet",
  "contentPath": "<relative path to the file in the .demo folder> (optional)"
  "args": {
    // Define the argument name in the snippet file with curly braces {argument name}
    "<argument name>": "<argument value>"
  }
}
```

  </td>
  </tr>
</table>

> You can find examples of snippets in the [snippets](https://github.com/estruyf/vscode-demo-time/tree/dev/snippets) folder.

#### Snippet example

In the demo file, you can reference a snippet file. The snippet file can contain multiple steps which can be reused in multiple demos.

```json
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
```

> The `contentPath` property its value is relative to the `.demo` folder. So, in the example above, the snippet file is located in the `.demo/snippets` folder.

> In the `args` property, you can define the arguments/variables which you want to use in the snippet file. In the snippet file, you can reference these arguments with curly braces `{argument name}`.

In the `insert_and_highlight.json` file, you can define the steps you want to execute.

```json
[
  {
    "action": "unselect",
    "path": "{MAIN_FILE}"
  },
  {
    "action": "insert",
    "path": "{MAIN_FILE}",
    "contentPath": "{CONTENT_PATH}",
    "position": "{CONTENT_POSITION}"
  },
  {
    "action": "highlight",
    "path": "{MAIN_FILE}",
    "position": "{HIGHLIGHT_POSITION}"
  }
]
```

## Settings

| Setting | Description | Default |
| --- | --- | --- |
| `demoTime.highlightBorderColor` | The border color of the highlighted code | `rgba(255,0,0,0.5)` |
| `demoTime.highlightZoomEnabled` | Enable zooming when highlighting code | `false` |
| `demoTime.showClock` | Show a clock in the status bar | `true` |
| `demoTime.timer` | Count down timer for how long the session should last. If not set, it will not count down. The value is the number of minutes. | `null` |
| `demoTime.insertLineSpeed` | The speed in milliseconds for inserting lines. If you set it to `0`, it will insert its content immediately. | `25` |

## Tips and tricks

### Working with variables

You can define variables in a `variables.json` file in the `.demo` folder. You can reference these variables in your demo steps by using curly braces `{variable_name}`.

#### Example variables file

```json
{
  "SLIDES_URL": "http://localhost:3030"
}
```

#### Example demo step

```json
{
  "action": "executeVSCodeCommand",
  "command": "simpleBrowser.show",
  "args": "{SLIDES_URL}"
}
```

### Position

For the position you can use the following formats:

- `number`: The line number
- `number:number`: The start and end line number
- The `start` and `end` keywords can also be used instead of the line numbers
  - `start` will be replaced by the first line number
  - `end` will be replaced by the last line number

### Adding content to a file

When you want to insert content to a file, you can use the `content` or `contentPath` properties in the demo step.

| Property | Description |
| --- | --- |
| `content` | This property allows you to add the content directly in the JSON file, but this can make your JSON file quite big and it can be hard to read. |
| `contentPath` | This property allows you to reference a file in the `.demo` folder. This way you can keep your JSON file clean and add the content in separate files. **Important**: the path is relative to the `.demo` folder. |

### Example demo file

Here is an example demo:

```json
{
  "$schema": "https://elio.dev/demo-time.schema.json",
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

- [presentation-github-actions](https://github.com/estruyf/presentation-github-actions) 
- [presentation-m365-playwright-github-actions](https://github.com/estruyf/presentation-m365-playwright-github-actions)

## Support

If you enjoy my work and find them useful, consider sponsor me and the ecosystem to help Open Source sustainable. Thank you!

<p align="center">
  <a href="https://github.com/sponsors/estruyf" title="Sponsor Elio Struyf" target="_blank">
    <img src="https://img.shields.io/badge/Sponsor-Elio%20Struyf%20%E2%9D%A4-%23fe8e86?logo=GitHub&style=flat-square" height="25px" alt="Sponsor @estruyf" />
  </a>
</p>

<br />
<br />

<p align="center">
  <a href="https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time">
    <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time&labelColor=%23555555&countColor=%2397ca00" height="25px" alt="Front Matter visitors" />
  </a>
</p>
