import * as vscode from 'vscode';

interface Slide {
  title: string;
  content: string; // Markdown content
}

export class Slides {
  private static slides: Slide[] = [];
  private static currentSlideIndex = -1;
  private static webviewPanel: vscode.WebviewPanel | undefined;

  public static registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('demo-time-lite.showSlide', async (slideIndex?: number) => {
        if (this.slides.length === 0) {
          await this.loadSlides();
        }

        if (typeof slideIndex === 'number' && slideIndex >= 0 && slideIndex < this.slides.length) {
          this.currentSlideIndex = slideIndex;
        } else if (this.slides.length > 0 && this.currentSlideIndex === -1) {
          this.currentSlideIndex = 0; // Start with the first slide if none is specified and not started
        }

        this.displayCurrentSlide();
      }),
      vscode.commands.registerCommand('demo-time-lite.nextSlide', () => {
        if (this.currentSlideIndex < this.slides.length - 1) {
          this.currentSlideIndex++;
          this.displayCurrentSlide();
        } else {
          vscode.window.showInformationMessage('End of slides.');
        }
      }),
      vscode.commands.registerCommand('demo-time-lite.previousSlide', () => {
        if (this.currentSlideIndex > 0) {
          this.currentSlideIndex--;
          this.displayCurrentSlide();
        } else {
          vscode.window.showInformationMessage('Beginning of slides.');
        }
      })
    );
  }

  private static async loadSlides() {
    // Placeholder for loading slides from a .demo file or Markdown files
    // For now, using dummy slides
    this.slides = [
      { title: 'Slide 1', content: '# Slide 1\n\nHello from Demo Time Lite!' },
      { title: 'Slide 2', content: '# Slide 2\n\nThis is the second slide.' },
      { title: 'Slide 3', content: '## Slide 3\n\n- Point 1\n- Point 2' }
    ];
    this.currentSlideIndex = -1; // Reset to allow starting from the first slide
    vscode.window.showInformationMessage('Slides loaded (dummy data)');
  }

  private static displayCurrentSlide() {
    if (this.currentSlideIndex < 0 || this.currentSlideIndex >= this.slides.length) {
      vscode.window.showWarningMessage('No slide to display or index out of bounds.');
      if (this.webviewPanel) {
        this.webviewPanel.dispose();
      }
      return;
    }

    const slide = this.slides[this.currentSlideIndex];

    if (!this.webviewPanel) {
      this.webviewPanel = vscode.window.createWebviewPanel(
        'demoTimeLiteSlides',
        'Demo Time Lite Slides',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true // Be cautious with scripts if loading external content
        }
      );

      this.webviewPanel.onDidDispose(() => {
        this.webviewPanel = undefined;
        // Optionally reset slide index or state if panel is closed by user
        // this.currentSlideIndex = -1;
      }, null);
    }

    this.webviewPanel.title = slide.title;
    // For simplicity, directly using Markdown.
    // A more robust solution would convert Markdown to HTML.
    // VS Code's built-in Markdown previewer does this, but for custom webviews, you might need a library.
    this.webviewPanel.webview.html = this.getWebviewContent(slide);
    this.webviewPanel.reveal(vscode.ViewColumn.Beside);
  }

  private static getWebviewContent(slide: Slide): string {
    // Basic HTML structure. For real Markdown rendering, a library like 'marked' or 'markdown-it' would be used.
    // VS Code webviews also have security considerations for content and scripts.
    // For now, we'll just display the raw Markdown wrapped in a <pre> tag for simplicity,
    // or a very basic HTML representation.

    // Basic Markdown to HTML conversion
    let htmlContent = slide.content;

    // Headers
    htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');

    // Bold and Italic
    htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    htmlContent = htmlContent.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Unordered lists
    htmlContent = htmlContent.replace(/^\* (.*$)/gim, '<li>$1</li>');
    // Wrap contiguous <li> elements in <ul>
    htmlContent = htmlContent.replace(/(<li>.*<\/li>)(?:\n|\r\n)*(<li>.*<\/li>)/gim, '$1$2'); // Join list items separated by single newlines
    htmlContent = htmlContent.replace(/^(<li>.*<\/li>)$/gim, '<ul>$1</ul>'); // Wrap single line lists
    // Handle multi-line lists by finding blocks of <li>
    htmlContent = htmlContent.replace(/((?:<li>.*?<\/li>\s*)+)/gim, (match) => {
      // Only wrap if not already wrapped
      if (!match.startsWith('<ul>')) {
        return `<ul>\n${match.trim()}\n</ul>`;
      }
      return match;
    });


    // Line breaks
    htmlContent = htmlContent.replace(/(\r\n|\n|\r)/gm, '<br>');
    // Correct <br> inside <ul> which might have been added before list processing
    htmlContent = htmlContent.replace(/<ul><br>/gim, '<ul>');
    htmlContent = htmlContent.replace(/<br><\/ul>/gim, '</ul>');
    htmlContent = htmlContent.replace(/<\/li><br><li>/gim, '</li><li>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slide.title}</title>
    <style>
      body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); padding: 20px; }
      h1, h2, h3 { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    ${htmlContent}
    <hr>
    <p>Slide ${this.currentSlideIndex + 1} of ${this.slides.length}</p>
</body>
</html>`;
  }
}
