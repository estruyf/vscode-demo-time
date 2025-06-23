# Revision notes

- Install the add-in in PowerPoint.
- On the add-in, you should be able to enter a server URL and demo ID.
  - The server URL is the URL that you get from the Demo Time - Visual Studio Code extension
    (https://marketplace.visualstudio.com/items?itemName=eliostruyf.vscode-demo-time). By default
    this is "https://localhost:3710". Change this to "https://demotime-powerpoint.elio.dev" to use
    the demo server.
  - The demo ID is the ID of the command that you want to execute from the Demo Time project in
    Visual Studio Code. For this test, you can define "demo1".
- Click on the "save" button to save the settings.
- Click on the "test" button to test if a browser opens with the following URL format:
  "https://demotime-powerpoint.elio.dev/api/runById?id=&bringToFront=true".
- On the page, you should see a message like: "You are about to open the Demo Time - Visual Studio
  Code extension. The demo you want to run is: demo1"
