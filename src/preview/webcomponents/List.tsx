import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WebViewMessages } from '../../constants';

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
    <div>
      {visibleChildren}
    </div>
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

    // Create a mount element
    const mountPoint = document.createElement('div');
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

  renderComponent() {
    if (this.rootElm) {
      // Get all child elements and convert them to React elements
      const childElements = Array.from(this.children);
      const totalItems = childElements.length;
      
      // Convert HTML elements to React elements
      const reactChildren = childElements.map((element, index) => (
        <div key={index} dangerouslySetInnerHTML={{ __html: element.outerHTML }} />
      ));

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