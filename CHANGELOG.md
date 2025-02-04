# Change Log

## [0.0.65] - 2025-02-04

- [#44](https://github.com/estruyf/vscode-demo-time/issues/44): Fix code highlighting when line number + character positioning is used

## [0.0.64] - 2025-02-03

- Fix issue in configuration defaults for JSONC files
- Added names to the status bar items so that it is easier to identify them when disabling/enabling them
- Added status bar item to open the demo notes

## [0.0.63] - 2025-01-25

- Update the rocket icon to the Demo Time logo in the status bar
- [#40](https://github.com/estruyf/vscode-demo-time/issues/40): Added the `executeScript` action to execute a script in the background and store the result in a `SCRIPT_<script ID>` variable

## [0.0.62] - 2025-01-22

- [#40](https://github.com/estruyf/vscode-demo-time/issues/40): Added the `setState` action to set a state key/value. Use the state as `STATE_<key>` in the demo steps
- [#41](https://github.com/estruyf/vscode-demo-time/issues/41): Added the `DT_INPUT` and `DT_CLIPBOARD` variables to get the input and clipboard content in the demo steps

## [0.0.61] - 2025-01-15

- Removed highlight left padding

## [0.0.60] - 2025-01-14

- [#37](https://github.com/estruyf/vscode-demo-time/issues/37): Added an URI handler for `next` and `runbyid` commands
- [#38](https://github.com/estruyf/vscode-demo-time/issues/38): Automatically start the extension when there is a `.demo` folder in the workspace

## [0.0.59] - 2025-01-13

- Refactor in the tree view provider to avoid flickering when updating the demo steps

## [0.0.58] - 2025-01-12

- Action grouping in the quick pick selection of the `Demo Time: Add new action to demo step` command

## [0.0.57] - 2025-01-11

- [#36](https://github.com/estruyf/vscode-demo-time/issues/36): Added the `format` action to format the code in the editor

## [0.0.56] - 2025-01-10

- [#34](https://github.com/estruyf/vscode-demo-time/issues/34): Added the ability to have start and end placeholders for text actions like `insert`, `replace`, and `delete`
- [#35](https://github.com/estruyf/vscode-demo-time/issues/35): Added the `Demo Time: Add new action to demo step` command + editor title action to make it easier to add new actions to demo steps

## [0.0.55] - 2025-01-09

- [#31](https://github.com/estruyf/vscode-demo-time/issues/31): Added the `terminalId` property to target the terminal to use for the `executeTerminalCommand` and `closeTerminal` actions
- [#32](https://github.com/estruyf/vscode-demo-time/issues/32): Added the `closeTerminal` action

## [0.0.54] - 2025-01-09

- Added CORS support for the local API

## [0.0.53] - 2025-01-09

- [#29](https://github.com/estruyf/vscode-demo-time/issues/29): Added the local API to support external integrations with Demo Time (e.g., [Slidev](https://sli.dev/))

## [0.0.52] - 2025-01-08

- Added the description or label as the tooltip for the demo steps in the panel
- Added the `overwrite` property for the `rename` and `copy` file actions
- [#20](https://github.com/estruyf/vscode-demo-time/issues/20): Added the `copy` file action
- [#21](https://github.com/estruyf/vscode-demo-time/issues/21): Added the `move` file action

## [0.0.51] - 2025-01-07

- Add open documentation action and link it to the editor title for JSON files

## [0.0.50] - 2025-01-06

- [#23](https://github.com/estruyf/vscode-demo-time/issues/23): Add the ability to add notes to demos
- [#24](https://github.com/estruyf/vscode-demo-time/issues/24): Added the `close` and `closeAll` actions to close editors
- [#27](https://github.com/estruyf/vscode-demo-time/issues/27): Moved the JSON schema to the documentation site

## [0.0.49] - 2024-12-30

- [#22](https://github.com/estruyf/vscode-demo-time/issues/22): Better zoom support for the highlight action

## [0.0.48] - 2024-12-29

- Update the README with the new actions

## [0.0.47] - 2024-12-27

- [#16](https://github.com/estruyf/vscode-demo-time/issues/16): added the `deleteFile` action
- [#17](https://github.com/estruyf/vscode-demo-time/issues/17): Added the `rename` file action
- [#18](https://github.com/estruyf/vscode-demo-time/issues/18): Added the `save` and `write` actions to the `Demo Time: Add as demo step` command.

## [0.0.46] - 2024-12-20

- Improved the `position` setting so that you can define `<start line>,<start character>` a specific position or `<start line>,<start character>:<end line>,<end character>` to select a range of code
- Added the `positionCursor` action to set the cursor position in the editor
- Added the `write` action to write a single line of text to the editor
- Added the `save` action to save the current file

## [0.0.45] - 2024-12-19

- Updated documentation URL

## [0.0.44] - 2024-12-18

- Updated the README with link to the new documentation site

## [0.0.43] - 2024-12-13

- [#12](https://github.com/estruyf/vscode-demo-time/issues/12): Added the presenter view which you can open with the `Demo Time: Show presenter view`

## [0.0.42] - 2024-12-11

- Fix the before blur and opacity decoration

## [0.0.41] - 2024-12-11

- Fix for blur and opacity when only one line is highlighted
- Fix issue when using the same demo titles in the same demo file

## [0.0.40] - 2024-12-11

- [#9](https://github.com/estruyf/vscode-demo-time/issues/9): Added the ability to run the previous demo step when in presentation mode by enabling the `demoTime.previousEnabled` setting
- [#11](https://github.com/estruyf/vscode-demo-time/issues/11): Included a fix to support web
- [#13](https://github.com/estruyf/vscode-demo-time/issues/13): Add the extension to the recommended extensions list of the project on initialization
- [#15](https://github.com/estruyf/vscode-demo-time/issues/15): Hide the timer action when the timer is not enabled

## [0.0.39] - 2024-12-10

- [#10](https://github.com/estruyf/vscode-demo-time/issues/10): Added the `demoTime.highlightBlur` and `demoTime.highlightOpacity` settings to change the blur and opacity effect on the non-highlighted code
- [#14](https://github.com/estruyf/vscode-demo-time/issues/14): Added the `demoTime.highlightBackground` setting to change the highlight background color

## [0.0.38] - 2024-12-09

- Continue with the first demo step in the next demo file if the current demo file is completed

## [0.0.37] - 2024-12-09

- [#2](https://github.com/estruyf/vscode-demo-time/issues/2): Added the ability to have a `variables.json` file to store variables/constants that can be used in the demo steps
- Added example snippets to the project

## [0.0.36] - 2024-12-09

- Added the `setSetting` action to update a setting value

## [0.0.35] - 2024-12-07

- Updated the README with snippets information

## [0.0.34] - 2024-12-07

- Added browser extension support

## [0.0.33] - 2024-12-06

- New `markdownPreview` action to open a markdown preview
- Added `path` property support for the `executeVSCodeCommand` action

## [0.0.32] - 2024-11-20

- Improved line by line insertion
- Added an action to show the demo step in the demo file

## [0.0.31] - 2024-11-20

- Disable line insertion delay by default

## [0.0.30] - 2024-10-30

- Updated the line insertion deplay setting to `demoTime.lineInsertionDelay`
- Added the `lineInsertionDelay` property to the demo step schema so that you can define it per insert/replace step

## [0.0.29] - 2024-10-29

- Implement a line-by-line insert/replace action
- Configure the line-by-line insert/replace speed with the `demoTime.lineInsertionDelay` setting

## [0.0.28] - 2024-10-21

- Changed completed action icon color
- [#4](https://github.com/estruyf/vscode-demo-time/issues/4): Added the option to show a clock
- [#5](https://github.com/estruyf/vscode-demo-time/issues/5): Added the option to show a countdown timer

## [0.0.27] - 2024-10-17

- Optional start and end icons for the demo steps

## [0.0.26] - 2024-10-17

- Support setting custom icons for the demo steps

## [0.0.25] - 2024-10-17

- Add a collapse all button to the demo time panel

## [0.0.24] - 2024-10-14

- Select by ID if present, otherwise select by title

## [0.0.23] - 2024-10-14

- Show the correct next demo if started with the `demo-time.runById` command

## [0.0.22] - 2024-10-14

- Added the `demo-time.runById` command to execute a specific demo step from VS Code. Useful for Slidev integration.

## [0.0.21] - 2024-10-14

- Add JSONC parser to support comments in the demo files

## [0.0.20] - 2024-06-07

- [#3](https://github.com/estruyf/vscode-demo-time/issues/3): Added a statusbar item to show the next step to execute

## [0.0.19] - 2024-05-18

- [#1](https://github.com/estruyf/vscode-demo-time/issues/1): Added the ability to use snippets/templates in the demo steps

## [0.0.18] - 2024-02-01

- Update the README

## [0.0.17] - 2024-02-01

- Sort demo files by name
- Fix issue where demos with the same name were all check when executed

## [0.0.16] - 2024-02-01

- Move order of open command to be able to open binary files

## [0.0.15] - 2024-01-30

- Added gif to the README

## [0.0.14] - 2024-01-30

- Added the `showInfoMessage` action to show an info message in Visual Studio Code

## [0.0.13] - 2023-12-20

- Added the step move up/down panel actions

## [0.0.12] - 2023-12-20

- `executeTerminalCommand` creates a specific terminal for Demo Time

## [0.0.11] - 2023-12-18

- Added the `executeVSCodeCommand` action to execute a VS Code command
- Added the `executeTerminalCommand` action to execute a shell command

## [0.0.10] - 2023-12-15

- Reveal range when highlighting code
- Added a zoom option to the highlight code action which can be enabled with the `demoTime.highlightZoomEnabled` setting

## [0.0.9] - 2023-12-14

- Change the highlight behaviour to show a rectangle around the code instead of selecting the code
- Added the `demoTime.highlightBorderColor` setting to change the border color of the highlight rectangle

## [0.0.8] - 2023-12-14

- Add a presentation mode which allows you to use a clicker to navigate through the demo steps

## [0.0.7] - 2023-12-14

- Keep state of the demo steps for the workspace
- Added a `start` action on the demo file in the panel
- The `demo-time.start` command now runs the next step
- Added `reset` command
- Added `reset` action to the view title

## [0.0.6] - 2023-12-13

- Bring inserted or replaced lines into view
- Set the position of the cursor after inserting or replacing text to the start position

## [0.0.5] - 2023-12-12

- Added listener for demo file changes
- Added `unselect` action
- Added `waitForTimeout` action
- Added `waitForInput` action
- Added `contentPath` property to demo steps to allow code snippets as files instead of content in the JSON
- `start` and `end` keywords for `position` property

## [0.0.4] - 2023-12-09

- Changed logo and banner on VS Code Marketplace

## [0.0.3] - 2023-12-09

- Added small logo for the activity bar
- Added welcome text with initialize command
- Added a view demo file command and action in the panel
- Added a `No demo steps defined` message when no demo steps are defined

## [0.0.2] - 2023-12-08

- Added the first logo

## [0.0.1] - 2023-12-08

- Initial release
