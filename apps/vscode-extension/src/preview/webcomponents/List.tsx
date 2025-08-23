import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WebViewMessages } from '@demotime/common';
import { transformMarkdown } from '../../utils/transformMarkdown';
import { renderToString } from 'react-dom/server';

export interface IProgressiveListProps {
  totalItems: number;
  children: React.ReactNode;
}

export const ProgressiveList: React.FunctionComponent<IProgressiveListProps> = ({
  totalItems,
  children,
}) => {
  const [visibleCount, setVisibleCount] = React.useState<number>(0);

  const handleEvent = React.useCallback((event: KeyboardEvent | MouseEvent) => {
    const isKeyPress = event instanceof KeyboardEvent && event.key === 'ArrowRight';
    const isClick = event instanceof MouseEvent;

    if (isKeyPress || isClick) {
      setVisibleCount((prevCount) => {
        const newCount = Math.min(prevCount + 1, totalItems);

        if (newCount >= totalItems) {
          window.removeEventListener('keydown', handleEvent);
          window.removeEventListener('click', handleEvent);
          messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: false });
        } else {
          messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: true });
        }

        return newCount;
      });
    }
  }, [totalItems]);

  React.useEffect(() => {
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: true });
    window.addEventListener('keydown', handleEvent);
    window.addEventListener('click', handleEvent);

    return () => {
      messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: false });
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('click', handleEvent);
    };
  }, [handleEvent]);

  // Show only the visible items
  const visibleChildren = React.Children.toArray(children).slice(0, visibleCount);

  return (
    <>
      {visibleChildren}
    </>
  );
};

class ListWebComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  private rootElm: Root | null = null;
  private rootObserver: MutationObserver | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.style.display = 'block';
    // Create a ShadowDOM
    this.root = this.attachShadow({ mode: 'open' });

    // Inject default list styles
    const style = document.createElement('style');
    style.textContent = `
      ul,
      ol {
        padding: 0;
        margin-left: 1.5rem;

        li {
          margin-bottom: 0.5rem;
        }

        ul,
        ol {
          margin-top: 0.5rem;
        }
      }

      ul {
        list-style-type: disc;
      }

      ol {
        list-style-type: decimal;
      }
    `;
    this.root.appendChild(style);

    // Determine list type
    const listType = this.getAttribute('type') === 'ol' ? 'ol' : 'ul';

    // Create a mount element
    const mountPoint = document.createElement(listType);
    this.root.appendChild(mountPoint);

    this.rootElm = createRoot(mountPoint);
    this.renderComponent();

    const mutationObserver: MutationCallback = (mutationList: MutationRecord[], observer: MutationObserver) => {
      for (const m of mutationList) {
        if (m.target === this) {
          this.renderComponent();
        }
      }
    };

    this.rootObserver = new MutationObserver(mutationObserver);
    this.rootObserver.observe(this, {
      childList: true, subtree: true
    });
  }

  async renderComponent() {
    if (this.rootElm) {
      // Get all child elements and convert them to React elements
      let childElements = Array.from(this.children);
      let totalItems = childElements.length;

      if (!childElements.length && this.innerHTML) {
        const parsedContent = await transformMarkdown(this.innerHTML);
        const html = renderToString(parsedContent.reactContent);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        childElements = Array.from(tempDiv.querySelectorAll('li')) || [];
        totalItems = childElements.length;
      }

      // Convert HTML elements to React elements, rendering HTML content inside list items
      const reactChildren = childElements.map((element, index) =>
        React.createElement(
          element.tagName.toLowerCase(),
          {
            key: index,
            ...Array.from(element.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {} as Record<string, string>),
            dangerouslySetInnerHTML: { __html: element.innerHTML }
          }
        )
      );

      this.rootElm.render(
        <ProgressiveList totalItems={totalItems}>
          {reactChildren}
        </ProgressiveList>
      );
    }
  }

  disconnectedCallback() {
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: false });
    if (this.rootElm) {
      this.rootElm.unmount();
    }

    if (this.rootObserver) {
      this.rootObserver.disconnect();
    }
  }
}

customElements.define('dt-list', ListWebComponent);