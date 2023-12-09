# Demo Time

A Visual Studio Code extension that allows you to smoothly present coding demos within the editor.

*WIP*

## Features

Currently the extension supports the following features:

- Multiple demo files located in `.demo` folder
- Demo Time panel to execute your demo steps
- Add new demo steps (execute the `Demo Time: Add as demo step` command)

### Supported demo steps

#### File actions

- `create`: Create a new file
- `open`: Open a file

#### Code actions

- `insert`: Insert code into a file
- `highlight`: Select code in a file
- `replace`: Replace code in a file
- `delete`: Delete code from a file

## Usage

To use the extension, you need to create a `.demo` folder in your workspace. Once created, you can add a JSON file which contains the demo and its steps.

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
    <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time&labelColor=%2386836d&countColor=%232f4858" height="25px" alt="Front Matter visitors" />
  </a>
</p>
