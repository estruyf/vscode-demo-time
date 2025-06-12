# Revision notes

- Install the add-in in PowerPoint.
- On the add-in, you should be able to enter a server URL and command ID.
  - The server URL is the URL that you get from the Demo Time - Visual Studio Code extension
    (https://marketplace.visualstudio.com/items?itemName=eliostruyf.vscode-demo-time). By default
    this is "https://localhost:3710". You can leave this as is.
  - The command ID is the ID of the command that you want to execute from the Demo Time project in
    Visual Studio Code. For this test, you can define "demo1".
- Click on the "save" button to save the settings.
- Click on the "test" button to test if a browser opens with the following URL format:
  "http://localhost:3710/api/runById?id=&bringToFront=true".

The browser will tell you that the site doesn't exist. This is expected behavior, as the server is
not running. The add-in shows notes how to use and configure the Demo Time - Visual Studio Code
extension to enable the API, define a command ID, etc.
