# Change Log

## [0.0.31] - 2025-11-20

- Disable line insertion delay by default

## [0.0.30] - 2025-10-30

- Updated the line insertion deplay setting to `demoTime.lineInsertionDelay`
- Added the `lineInsertionDelay` property to the demo step schema so that you can define it per insert/replace step

## [0.0.29] - 2025-10-29

- Implement a line-by-line insert/replace action
- Configure the line-by-line insert/replace speed with the `demoTime.insertLineSpeed` setting

## [0.0.28] - 2025-10-21

- Changed completed action icon color
- [#4](https://github.com/estruyf/vscode-demo-time/issues/4): Added the option to show a clock
- [#5](https://github.com/estruyf/vscode-demo-time/issues/5): Added the option to show a countdown timer

## [0.0.27] - 2025-10-17

- Optional start and end icons for the demo steps

## [0.0.26] - 2025-10-17

- Support setting custom icons for the demo steps

## [0.0.25] - 2025-10-17

- Add a collapse all button to the demo time panel

## [0.0.24] - 2025-10-14

- Select by ID if present, otherwise select by title

## [0.0.23] - 2025-10-14

- Show the correct next demo if started with the `demo-time.runById` command

## [0.0.22] - 2025-10-14

- Added the `demo-time.runById` command to execute a specific demo step from VS Code. Useful for Slidev integration.

## [0.0.21] - 2025-10-14

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
