# PowerPoint Demo Time Add-in

This simple PowerPoint content add-in triggers the Demo Time API when the slide is shown.

## Configuration

1. Insert the **Demo Time Trigger** add-in on a slide.
2. Set the server URL, command id and whether the window should be brought to the front.
3. Press **Save**. The values are stored in `localStorage` and reused the next time the add-in loads.

Once the add-in becomes visible, it automatically posts to `/api/runbyid` on the configured server.
