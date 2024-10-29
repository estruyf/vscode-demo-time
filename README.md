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

Currently the extension supports the following features:

- Multiple demo files located in `.demo` folder
- Support for code/snippet files in the `.demo` folder. These files can be referenced in the demo steps, instead of adding the code in the JSON file.
- Explorer panel to execute your demo steps
- Add new demo steps (execute the `Demo Time: Add as demo step` command)
- Run through the demo steps (execute the `Demo Time: Start` command)
- Presentation mode which allows you to use a clicker to navigate through the demo steps
- Run a specific demo step from a command execution with the `demo-time.runById` command

### Supported demo steps

#### File actions

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
</table>

#### Code actions

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
  "contentPath": "<relative path to the file in the .demo folder> (optional)"
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
  "contentPath": "<relative path to the file in the .demo folder> (optional)"
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

#### Time actions

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

#### VSCode actions

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
  "args": "<arguments to pass to the command (optional)>"
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

#### Terminal actions

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

#### Snippets

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

## Usage

To use the extension, you need to create a `.demo` folder in your workspace. Once created, you can add a JSON file which contains the demo and its steps.

## Settings

| Setting | Description | Default |
| --- | --- | --- |
| `demoTime.highlightBorderColor` | The border color of the highlighted code | `rgba(255,0,0,0.5)` |
| `demoTime.highlightZoomEnabled` | Enable zooming when highlighting code | `false` |
| `demoTime.showClock` | Show a clock in the status bar | `true` |
| `demoTime.timer` | Count down timer for how long the session should last. If not set, it will not count down. The value is the number of minutes. | `null` |
| `demoTime.insertLineSpeed` | The speed in milliseconds for inserting lines. If you set it to `0`, it will insert its content immediately. | `25` |

### Tips

#### Position

For the position you can use the following formats:

- `number`: The line number
- `number:number`: The start and end line number
- The `start` and `end` keywords can also be used instead of the line numbers
  - `start` will be replaced by the first line number
  - `end` will be replaced by the last line number

#### Adding content to a file

When you want to insert content to a file, you can use the `content` or `contentPath` properties in the demo step.

| Property | Description |
| --- | --- |
| `content` | This property allows you to add the content directly in the JSON file, but this can make your JSON file quite big and it can be hard to read. |
| `contentPath` | This property allows you to reference a file in the `.demo` folder. This way you can keep your JSON file clean and add the content in separate files. **Important**: the path is relative to the `.demo` folder. |

### Example

Here is an example demo:

```json
{
  "$schema": "https://elio.dev/demo-time.schema.json",
  "title": "Playwright demo",
  "description": "Playwright demo for Microsoft 365",
  "demos": [{
      "title": "Login to Microsoft 365",
      "description": "Login to Microsoft 365 using Playwright",
      "steps": [{
          "action": "create",
          "path": "/tests/login.setup.ts",
          "content": "import { test as setup } from \"@playwright/test\";\nimport { existsSync } from \"fs\";\n\nconst authFile = \"playwright/.auth/user.json\";\n\n// More info: https://playwright.dev/docs/auth\n\nsetup(\"authenticate\", async ({ page }) => {\n  // Check if the auth file exists\n  if (existsSync(authFile)) {\n    return;\n  }\n\n  await page.goto(process.env.SP_DEV_PAGE_URL || \"\");\n\n  page.locator(\"input[type=email]\").fill(process.env.SP_DEV_USERNAME || \"\");\n\n  await page.getByRole(\"button\", { name: \"Next\" }).click();\n\n  page.locator(\"input[type=password]\").fill(process.env.SP_DEV_PASSWORD || \"\");\n\n  await Promise.all([\n    await page.locator(\"input[type=submit][value='Sign in']\").click(),\n    await page.locator(\"input[type=submit][value='Yes']\").click(),\n    await page.waitForURL(process.env.SP_DEV_PAGE_URL || \"\"),\n  ]);\n\n  await page.context().storageState({ path: authFile });\n});"
        },
        {
          "action": "open",
          "path": "/tests/login.setup.ts"
        }
      ]
    },
    {
      "title": "First SharePoint tests",
      "description": "Create the first SharePoint tests",
      "steps": [{
          "action": "create",
          "path": "/tests/pages/sharepoint.spec.ts",
          "content": "import { test, expect, Page } from \"@playwright/test\";\n\n// test.describe.configure({ mode: \"serial\" });\n\ntest.describe(`Validate sticker inventory`, () => {\n  let page: Page;\n\n  test.beforeAll(async ({ browser }) => {\n    page = await browser.newPage();\n    await page.goto(process.env.SP_DEV_PAGE_URL || \"\", {\n      waitUntil: \"domcontentloaded\",\n    });\n\n    await page\n      .locator(\n        `div[data-sp-web-part-id=\"0e05b9af-5e56-4570-8b3e-9d679f8b2fcf\"]`\n      )\n      .waitFor();\n  });\n\n  test(`Check if webpart is rendered`, async () => {\n    const webpart = page.locator(\n      `div[data-sp-web-part-id=\"0e05b9af-5e56-4570-8b3e-9d679f8b2fcf\"]`\n    );\n    await expect(webpart).toBeVisible();\n  });\n\n  test.afterAll(async () => {\n    await page.close();\n  });\n});"
        },
        {
          "action": "open",
          "path": "/tests/pages/sharepoint.spec.ts"
        },
        {
          "action": "highlight",
          "path": "/tests/pages/sharepoint.spec.ts",
          "position": "21:26"
        }
      ]
    },
    {
      "title": "Check the amounts",
      "description": "Check the amounts of the stickers",
      "steps": [{
        "action": "insert",
        "path": "/tests/pages/sharepoint.spec.ts",
        "position": 27,
        "content": "\n  test(`Check if there are 7 stickers`, async () => {\n    const stickers = page.getByTestId(`sticker_inventory__overview__sticker`);\n    await expect(stickers).toHaveCount(7);\n  });\n"
      }]
    }
  ]
}
```

<br />
<br />

<p align="center">
  <a href="https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time">
    <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time&labelColor=%23555555&countColor=%2397ca00" height="25px" alt="Front Matter visitors" />
  </a>
</p>
