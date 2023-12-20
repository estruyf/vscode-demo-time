# Change Log

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
