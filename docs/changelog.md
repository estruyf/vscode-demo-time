## [1.8.0] - 2025-08-02

- [#199](https://github.com/estruyf/vscode-demo-time/issues/199): Improve loading the slides when
  switching between demo and slides
- [#204](https://github.com/estruyf/vscode-demo-time/issues/204): Added the `openTerminal` action to
  open a the terminal
- [#205](https://github.com/estruyf/vscode-demo-time/issues/205): Added the `hacker-typer` typing mode to the `insert`, `replace`, and `patch` actions
- [#207](https://github.com/estruyf/vscode-demo-time/issues/207): Made the `message` property
  optional for the GitHub Copilot chat actions
- [#208](https://github.com/estruyf/vscode-demo-time/issues/208): The JSON schema has been
  refactored to have intellisense per action on which properties are required and optional
- [#209](https://github.com/estruyf/vscode-demo-time/issues/209): The `path` property is not
  required anymore for the `unselect` action
- [#211](https://github.com/estruyf/vscode-demo-time/issues/211): Make the description property
  optional on the demo root
- [#212](https://github.com/estruyf/vscode-demo-time/issues/212): Fix encoding issue with ampersands
  in the `dt-list` component
- [#217](https://github.com/estruyf/vscode-demo-time/issues/217): Fix highlighting whole line when line number and 
  character positioning is used
- [#218](https://github.com/estruyf/vscode-demo-time/issues/218): Added a new `/api/demos` endpoint to 
  retrieve the list of demos in the workspace

## [1.7.1] - 2025-07-10

- [#202](https://github.com/estruyf/vscode-demo-time/issues/202): Fix an issue with the demo parsing
  during add demo step

## [1.7.0] - 2025-07-07

- [#169](https://github.com/estruyf/vscode-demo-time/issues/169): Refocus the editor after executing
  a terminal command
- [#173](https://github.com/estruyf/vscode-demo-time/issues/173): Allow to set the timer on the demo
  file level
- [#175](https://github.com/estruyf/vscode-demo-time/issues/175): Add some sample demos to the
  extension initialization to help users get started
- [#176](https://github.com/estruyf/vscode-demo-time/issues/176): Add support for GitHub Copilot
  Chat integration by adding `openChat`, `newChat`, `askChat`, `editChat`, `agentChat` and
  `closeChat` actions
- [#177](https://github.com/estruyf/vscode-demo-time/issues/177): Added the `copyToClipboard` action
  to copy text to the clipboard and it supports both text, file content, and variables
- [#180](https://github.com/estruyf/vscode-demo-time/issues/180): Fix path parsing for Windows and
  two-column slides
- [#182](https://github.com/estruyf/vscode-demo-time/issues/182): Improve text typing simulation
- [#184](https://github.com/estruyf/vscode-demo-time/issues/184): Allow the user to choose if they
  want to manually run the command or have it run automatically (default) by using the `autoExecute`
  option
- [#185](https://github.com/estruyf/vscode-demo-time/issues/185): Allow the `insertTypingMode` and
  `insertTypingSpeed` options to be used for the `executeTerminalCommand` action
- [#186](https://github.com/estruyf/vscode-demo-time/issues/186): Added the `typeText` action to
  simulate typing text in the editor
- [#187](https://github.com/estruyf/vscode-demo-time/issues/187): Added the `pasteFromClipboard`
  action to paste the clipboard content into the editor
- [#188](https://github.com/estruyf/vscode-demo-time/issues/188): Added the `pressEnter` action to
  simulate pressing the Enter key in the editor
- [#189](https://github.com/estruyf/vscode-demo-time/issues/189): Added `YAML` demo file support
  with configurable file type by using the `demoTime.defaultFileType` setting
- [#193](https://github.com/estruyf/vscode-demo-time/issues/193): Ask the user which demo file type
  they want to use when initializing the extension. The user can choose between `JSON` and `YAML`.
- [#196](https://github.com/estruyf/vscode-demo-time/issues/196): Added an API documentation page
  that can be viewed within Visual Studio Code or your browser.

## [1.6.0] - 2025-06-23

- New slide parser logic to support more complex front matter slide structures
- [#156](https://github.com/estruyf/vscode-demo-time/issues/156): Add preview action to hide the
  mouse cursor and action bar
- [#162](https://github.com/estruyf/vscode-demo-time/issues/162): Added a laser pointer action to
  the slide view
- [#164](https://github.com/estruyf/vscode-demo-time/issues/164): Added a slide zoom feature
- [#167](https://github.com/estruyf/vscode-demo-time/issues/167): Added Apple Keynote support

### Demo Time PowerPoint Add-in

- Implemented check to see if the slide on which the add-in was configured is moved. When it is
  moved, the add-in will show a message to let the user know the settings need to be saved again.

## [1.5.1] - 2025-06-17

- fix: add 'image' to allowed frontmatter properties in SlideParser

## [1.5.0] - 2025-06-16

- [#116](https://github.com/estruyf/vscode-demo-time/issues/116): Added support for slide header and
  footer
- [#130](https://github.com/estruyf/vscode-demo-time/issues/130): Fix slide transitions with images
- [#131](https://github.com/estruyf/vscode-demo-time/issues/131): Added the new `dt-list` component
  to show list items on click
  - [#132](https://github.com/estruyf/vscode-demo-time/issues/132): Added longer wait after a write
    file action
- [#133](https://github.com/estruyf/vscode-demo-time/issues/133): Fix positioning issue on image
  layouts
- [#136](https://github.com/estruyf/vscode-demo-time/issues/136): Focus window before reading
  clipboard in browser instances. Thanks to [Thomas Kratz](https://github.com/eiswind).
- [#139](https://github.com/estruyf/vscode-demo-time/issues/139): Fix the hide status bar item error
  when it is not initialized. Thanks to [Tom Bell](https://github.com/tjbell).
- [#140](https://github.com/estruyf/vscode-demo-time/issues/140): Added the ability to search and
  filter in the Demo Time treeview
- [#152](https://github.com/estruyf/vscode-demo-time/issues/152): Added the `openPowerPoint` action
  to open/focus the Microsoft PowerPoint application

## [1.4.0] - 2025-05-30

- [#97](https://github.com/estruyf/vscode-demo-time/issues/97): Support for Markdown slides with
  multiple slides (slide groups)
  - [#99](https://github.com/estruyf/vscode-demo-time/issues/99): PDF export support for multiple
    slides included
  - [#111](https://github.com/estruyf/vscode-demo-time/issues/111): Fix issue with comments in front
    matter parsing
  - [#115](https://github.com/estruyf/vscode-demo-time/issues/115): Fix the slide preview which is
    empty after saving twice
  - [#117](https://github.com/estruyf/vscode-demo-time/issues/117): Keep the current slide index
    when refreshing slide preview on save
- [#101](https://github.com/estruyf/vscode-demo-time/issues/101): Implementation of feedback
  - [#103](https://github.com/estruyf/vscode-demo-time/issues/103): Clear highlight the moment you
    run the next step
  - [#105](https://github.com/estruyf/vscode-demo-time/issues/105): Ability to pause the countdown
    and resume it
  - [#109](https://github.com/estruyf/vscode-demo-time/issues/109): Optimize the demo view with a
    maximum height, scroll current demo step into view, cleaner presentation notes view
- [#102](https://github.com/estruyf/vscode-demo-time/issues/102): Start all paths from the project
  folder instead of `.demo` folder by setting the `version` property in the demo file to `2`
- [#106](https://github.com/estruyf/vscode-demo-time/issues/106): Fix issue where file creating is
  slower than the async/await
- [#110](https://github.com/estruyf/vscode-demo-time/issues/110): Be able to change how the next
  action/step behaviour works with the `demoTime.nextActionBehaviour` setting
- [#112](https://github.com/estruyf/vscode-demo-time/issues/112): MCP server for Demo Time via
  [@demotime/mcp](https://www.npmjs.com/package/@demotime/mcp)
- [#113](https://github.com/estruyf/vscode-demo-time/pull/113): Enhancement for the end placeholder
  setting to look after the start placeholder index. Thanks to
  [Leonardo Montini](https://github.com/Balastrong).
- [#114](https://github.com/estruyf/vscode-demo-time/issues/114): Fix to show the correct view step
  demo. Thanks to [Leonardo Montini](https://github.com/Balastrong).
- [#122](https://github.com/estruyf/vscode-demo-time/issues/122): Add table support to the slides
- [#124](https://github.com/estruyf/vscode-demo-time/issues/124): Fix content for custom layouts

## [1.3.0] - 2025-04-24

- Highlight the current demo step in the tree view and the presenter view
- [#95](https://github.com/estruyf/vscode-demo-time/issues/95): Render the speaker notes in the
  presenter view

## [1.2.0] - 2025-04-17

- [#87](https://github.com/estruyf/vscode-demo-time/issues/87): Added new walkthrough for Visual
  Studio Code
- [#92](https://github.com/estruyf/vscode-demo-time/issues/92): Added new `demoTime.customTheme`
  setting for global custom themes
- [#96](https://github.com/estruyf/vscode-demo-time/issues/96): Correctly sorting the demo files in
  the tree view

## [1.1.0] - 2025-04-09

- [#88](https://github.com/estruyf/vscode-demo-time/issues/88): Added new animation components which
  can be used in slides: `fade-in`, `text-typewriter`, and `text-highlight`
- [#89](https://github.com/estruyf/vscode-demo-time/issues/89): Added support for
  [Mermaid](https://mermaid.js.org/) diagrams in the slides

## [1.0.1] - 2025-04-06

- [#90](https://github.com/estruyf/vscode-demo-time/issues/90): Highlighting whole line fix when
  position is set to start of the line

## [1.0.0] - 2025-04-03

- [#86](https://github.com/estruyf/vscode-demo-time/issues/86): Version `1.0.0` release
- [#85](https://github.com/estruyf/vscode-demo-time/issues/85): Support added for importing
  PowerPoint image slides

## [0.0.91] - 2025-03-31

- Optimized CSS theming in the PDF slides export
- [#83](https://github.com/estruyf/vscode-demo-time/issues/83): Added support for custom web
  components in the PDF slides export

## [0.0.90] - 2025-03-31

- [#83](https://github.com/estruyf/vscode-demo-time/issues/83): Added support for custom web
  components in the slide view

## [0.0.89] - 2025-03-29

- Small title theme fix in `quantum`
- Fix to open slide contents from slide preview

## [0.0.88] - 2025-03-28

- Two new themes: `quantum` and `frost`
- [#77](https://github.com/estruyf/vscode-demo-time/issues/77): Creating components to show or hide
  slide content based on clicks
- [#78](https://github.com/estruyf/vscode-demo-time/issues/78): Created the `arrow`, `circle`, and
  `rectangle` components to highlight areas on the slides
- [#79](https://github.com/estruyf/vscode-demo-time/issues/79): Trigger the first demo when turning
  on the presentation mode
- [#80](https://github.com/estruyf/vscode-demo-time/issues/80): Have an action on the slide view to
  show the mouse position. This can help you place the components correctly onto your slides

## [0.0.87] - 2025-03-23

- [#74](https://github.com/estruyf/vscode-demo-time/issues/74): Support for custom slide layouts
  with the `customLayout` property
- [#75](https://github.com/estruyf/vscode-demo-time/issues/75): Provide a filename for the PDF
  export
- [#76](https://github.com/estruyf/vscode-demo-time/issues/76): Added slide transition support with
  the `transition` property

## [0.0.86] - 2025-03-20

- Optimized package size
- [#63](https://github.com/estruyf/vscode-demo-time/issues/63): Added completion and hover panel
  support for the frontmatter of the markdown slides
- [#69](https://github.com/estruyf/vscode-demo-time/issues/69): Added the functionality to export
  the slides to a PDF file
- [#72](https://github.com/estruyf/vscode-demo-time/issues/72): Moved the custom theme property from
  the demo JSON to the slide's frontmatter

## [0.0.85] - 2025-03-18

- [#58](https://github.com/estruyf/vscode-demo-time/issues/58): Support theme changes in Shiki
  codeblocks on slides
- [#67](https://github.com/estruyf/vscode-demo-time/issues/67): Add the open slide source action to
  the slide view
- [#68](https://github.com/estruyf/vscode-demo-time/issues/68): Add the toggle action for the
  presentation mode to the slide view

## [0.0.84] - 2025-03-18

- Fix in dispose check on the presenter webview

## [0.0.83] - 2025-03-18

- [#64](https://github.com/estruyf/vscode-demo-time/issues/64): Slide list spacing improvements
- [#65](https://github.com/estruyf/vscode-demo-time/issues/65): When in presentation view, you can
  now exit it via `esc` key
- [#66](https://github.com/estruyf/vscode-demo-time/issues/66): Added record status to the status
  bar when turning on the presentation mode

## [0.0.82] - 2025-03-17

- Split the `presenter` and `preview` webview folder in the `out` folder

## [0.0.81] - 2025-03-10

- [#62](https://github.com/estruyf/vscode-demo-time/issues/62): Fix issue with theme retrieval in
  DevContainer that prevents slides to open

## [0.0.80] - 2025-03-06

- Updated the title
- Updated the description

## [0.0.79] - 2025-02-27

- Added the `unnamed` slide theme
- Added the `monomi` slide theme
- Added theme CSS variables
- [#59](https://github.com/estruyf/vscode-demo-time/issues/59): Added slide controls next and
  previous (if enabled)
- [#60](https://github.com/estruyf/vscode-demo-time/issues/60): Cursor visibility on the slide view
- [#61](https://github.com/estruyf/vscode-demo-time/issues/61): Added
  `demo-time.togglePresentationView` command, the `setPresentationView`, and `unsetPresentationView`
  actions

## [0.0.78] - 2025-02-25

- Added missing actions to the actions quick pick selection
- Added action verification script for the GitHub Actions release workflow

## [0.0.77] - 2025-02-25

- Update `template` to `theme` in Markdown slides

## [0.0.76] - 2025-02-24

- Fix for local development of preview-view
- Fix of background image when it is loaded from the local project

## [0.0.75] - 2025-02-24

- [#55](https://github.com/estruyf/vscode-demo-time/issues/55): Added slide support with new
  `openSlide` and `imagePreview` actions

## [0.0.74] - 2025-02-20

- Fix to render the tree view on initialize command
- Fix the view step action
- Added `open` action to the add demo step quick pick selection
- Added the `openWebsite` action to open a website in the browser or Visual Studio Code

## [0.0.73] - 2025-02-17

- [#53](https://github.com/estruyf/vscode-demo-time/issues/53): Add step numbers to the demo steps

## [0.0.72] - 2025-02-16

- Fix in `closeTerminal` action when no terminal ID is provided
- Fix in property name for `waitForTimeout`
- Add missing actions to the actions quick pick selection

## [0.0.71] - 2025-02-15

- [#50](https://github.com/estruyf/vscode-demo-time/issues/50): Added the
  `Demo Time: Toggle highlight of current line or selection` command to toggle the highlight of the
  current line or selection

## [0.0.70] - 2025-02-14

- Fix in `setSetting` action where the setting was not updated in the workspace configuration
- Added actions to the Demo Time panel menu
- [#49](https://github.com/estruyf/vscode-demo-time/issues/49): New command to create a new demo
  file
- [#47](https://github.com/estruyf/vscode-demo-time/issues/47): Added the `setTheme` and
  `unsetTheme` actions

## [0.0.69] - 2025-02-12

- [#45](https://github.com/estruyf/vscode-demo-time/issues/45): Ability to create a new demo file
  when adding a step or creating a snapshot
- [#45](https://github.com/estruyf/vscode-demo-time/issues/45): Ability to create a snapshot of the
  current file
- [#45](https://github.com/estruyf/vscode-demo-time/issues/45): Ability to create a patch file from
  the current file and a snapshot

## [0.0.68] - 2025-02-10

- Added the open notes action on the presenter view
- Small optimizations to the logo for the status bar, activity bar, and editor title

## [0.0.67] - 2025-02-08

- Added the new Demo Time logo

## [0.0.66] - 2025-02-05

- Added a new `demo-time.toggleHighlight` command which allows you to toggle the code highlight of
  the current demo step
- Support for highlighting an area of code by line&character positioning
- Added a `highlightWholeLine` property for the `highlight` action which can be used in combination
  with the start and end placeholders to turn off whole line highlighting

## [0.0.65] - 2025-02-04

- [#44](https://github.com/estruyf/vscode-demo-time/issues/44): Fix code highlighting when line
  number + character positioning is used

## [0.0.64] - 2025-02-03

- Fix issue in configuration defaults for JSONC files
- Added names to the status bar items so that it is easier to identify them when disabling/enabling
  them
- Added status bar item to open the demo notes

## [0.0.63] - 2025-01-25

- Update the rocket icon to the Demo Time logo in the status bar
- [#40](https://github.com/estruyf/vscode-demo-time/issues/40): Added the `executeScript` action to
  execute a script in the background and store the result in a `SCRIPT_<script ID>` variable

## [0.0.62] - 2025-01-22

- [#40](https://github.com/estruyf/vscode-demo-time/issues/40): Added the `setState` action to set a
  state key/value. Use the state as `STATE_<key>` in the demo steps
- [#41](https://github.com/estruyf/vscode-demo-time/issues/41): Added the `DT_INPUT` and
  `DT_CLIPBOARD` variables to get the input and clipboard content in the demo steps

## [0.0.61] - 2025-01-15

- Removed highlight left padding

## [0.0.60] - 2025-01-14

- [#37](https://github.com/estruyf/vscode-demo-time/issues/37): Added an URI handler for `next` and
  `runbyid` commands
- [#38](https://github.com/estruyf/vscode-demo-time/issues/38): Automatically start the extension
  when there is a `.demo` folder in the workspace

## [0.0.59] - 2025-01-13

- Refactor in the tree view provider to avoid flickering when updating the demo steps

## [0.0.58] - 2025-01-12

- Action grouping in the quick pick selection of the `Demo Time: Add new action to demo step`
  command

## [0.0.57] - 2025-01-11

- [#36](https://github.com/estruyf/vscode-demo-time/issues/36): Added the `format` action to format
  the code in the editor

## [0.0.56] - 2025-01-10

- [#34](https://github.com/estruyf/vscode-demo-time/issues/34): Added the ability to have start and
  end placeholders for text actions like `insert`, `replace`, and `delete`
- [#35](https://github.com/estruyf/vscode-demo-time/issues/35): Added the
  `Demo Time: Add new action to demo step` command + editor title action to make it easier to add
  new actions to demo steps

## [0.0.55] - 2025-01-09

- [#31](https://github.com/estruyf/vscode-demo-time/issues/31): Added the `terminalId` property to
  target the terminal to use for the `executeTerminalCommand` and `closeTerminal` actions
- [#32](https://github.com/estruyf/vscode-demo-time/issues/32): Added the `closeTerminal` action

## [0.0.54] - 2025-01-09

- Added CORS support for the local API

## [0.0.53] - 2025-01-09

- [#29](https://github.com/estruyf/vscode-demo-time/issues/29): Added the local API to support
  external integrations with Demo Time (e.g., [Slidev](https://sli.dev/))

## [0.0.52] - 2025-01-08

- Added the description or label as the tooltip for the demo steps in the panel
- Added the `overwrite` property for the `rename` and `copy` file actions
- [#20](https://github.com/estruyf/vscode-demo-time/issues/20): Added the `copy` file action
- [#21](https://github.com/estruyf/vscode-demo-time/issues/21): Added the `move` file action

## [0.0.51] - 2025-01-07

- Add open documentation action and link it to the editor title for JSON files

## [0.0.50] - 2025-01-06

- [#23](https://github.com/estruyf/vscode-demo-time/issues/23): Add the ability to add notes to
  demos
- [#24](https://github.com/estruyf/vscode-demo-time/issues/24): Added the `close` and `closeAll`
  actions to close editors
- [#27](https://github.com/estruyf/vscode-demo-time/issues/27): Moved the JSON schema to the
  documentation site

## [0.0.49] - 2024-12-30

- [#22](https://github.com/estruyf/vscode-demo-time/issues/22): Better zoom support for the
  highlight action

## [0.0.48] - 2024-12-29

- Update the README with the new actions

## [0.0.47] - 2024-12-27

- [#16](https://github.com/estruyf/vscode-demo-time/issues/16): added the `deleteFile` action
- [#17](https://github.com/estruyf/vscode-demo-time/issues/17): Added the `rename` file action
- [#18](https://github.com/estruyf/vscode-demo-time/issues/18): Added the `save` and `write` actions
  to the `Demo Time: Add as demo step` command.

## [0.0.46] - 2024-12-20

- Improved the `position` setting so that you can define `<start line>,<start character>` a specific
  position or `<start line>,<start character>:<end line>,<end character>` to select a range of code
- Added the `positionCursor` action to set the cursor position in the editor
- Added the `write` action to write a single line of text to the editor
- Added the `save` action to save the current file

## [0.0.45] - 2024-12-19

- Updated documentation URL

## [0.0.44] - 2024-12-18

- Updated the README with link to the new documentation site

## [0.0.43] - 2024-12-13

- [#12](https://github.com/estruyf/vscode-demo-time/issues/12): Added the presenter view which you
  can open with the `Demo Time: Show presenter view`

## [0.0.42] - 2024-12-11

- Fix the before blur and opacity decoration

## [0.0.41] - 2024-12-11

- Fix for blur and opacity when only one line is highlighted
- Fix issue when using the same demo titles in the same demo file

## [0.0.40] - 2024-12-11

- [#9](https://github.com/estruyf/vscode-demo-time/issues/9): Added the ability to run the previous
  demo step when in presentation mode by enabling the `demoTime.previousEnabled` setting
- [#11](https://github.com/estruyf/vscode-demo-time/issues/11): Included a fix to support web
- [#13](https://github.com/estruyf/vscode-demo-time/issues/13): Add the extension to the recommended
  extensions list of the project on initialization
- [#15](https://github.com/estruyf/vscode-demo-time/issues/15): Hide the timer action when the timer
  is not enabled

## [0.0.39] - 2024-12-10

- [#10](https://github.com/estruyf/vscode-demo-time/issues/10): Added the `demoTime.highlightBlur`
  and `demoTime.highlightOpacity` settings to change the blur and opacity effect on the
  non-highlighted code
- [#14](https://github.com/estruyf/vscode-demo-time/issues/14): Added the
  `demoTime.highlightBackground` setting to change the highlight background color

## [0.0.38] - 2024-12-09

- Continue with the first demo step in the next demo file if the current demo file is completed

## [0.0.37] - 2024-12-09

- [#2](https://github.com/estruyf/vscode-demo-time/issues/2): Added the ability to have a
  `variables.json` file to store variables/constants that can be used in the demo steps
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
- Added the `lineInsertionDelay` property to the demo step schema so that you can define it per
  insert/replace step

## [0.0.29] - 2024-10-29

- Implement a line-by-line insert/replace action
- Configure the line-by-line insert/replace speed with the `demoTime.lineInsertionDelay` setting

## [0.0.28] - 2024-10-21

- Changed completed action icon color
- [#4](https://github.com/estruyf/vscode-demo-time/issues/4): Added the option to show a clock
- [#5](https://github.com/estruyf/vscode-demo-time/issues/5): Added the option to show a countdown
  timer

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

- Added the `demo-time.runById` command to execute a specific demo step from VS Code. Useful for
  Slidev integration.

## [0.0.21] - 2024-10-14

- Add JSONC parser to support comments in the demo files

## [0.0.20] - 2024-06-07

- [#3](https://github.com/estruyf/vscode-demo-time/issues/3): Added a statusbar item to show the
  next step to execute

## [0.0.19] - 2024-05-18

- [#1](https://github.com/estruyf/vscode-demo-time/issues/1): Added the ability to use
  snippets/templates in the demo steps

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
- Added a zoom option to the highlight code action which can be enabled with the
  `demoTime.highlightZoomEnabled` setting

## [0.0.9] - 2023-12-14

- Change the highlight behaviour to show a rectangle around the code instead of selecting the code
- Added the `demoTime.highlightBorderColor` setting to change the border color of the highlight
  rectangle

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
- Added `contentPath` property to demo steps to allow code snippets as files instead of content in
  the JSON
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

