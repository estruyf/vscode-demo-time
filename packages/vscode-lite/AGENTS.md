## Demo Time Lite Agent Instructions

This file provides instructions for AI agents working on the Demo Time Lite VS Code extension.

### Extension Overview

Demo Time Lite is a lightweight version of the Demo Time extension, designed specifically for VS Code for the Web. It focuses on the core functionalities of running demo actions and displaying slides, excluding any desktop-specific features or creation tools.

### Key Considerations

*   **Browser Compatibility**: All code must be compatible with browser environments. Avoid using Node.js-specific APIs or modules that rely on a desktop environment.
*   **Performance**: Keep the extension lightweight and performant, as it will run in a browser.
*   **Dependencies**: Minimize dependencies and only include what is essential for the core functionalities.
*   **User Experience**: Ensure a smooth and intuitive user experience for running demos and viewing slides.

### Development Guidelines

*   Follow standard VS Code extension development practices.
*   Write clean, well-documented, and maintainable code.
*   Test thoroughly in a browser-based VS Code environment (e.g., vscode.dev).
*   Refer to the main Demo Time extension for inspiration, but adapt the code for the lite version's specific requirements.
