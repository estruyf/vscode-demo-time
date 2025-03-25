import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WebViewMessages } from '../../constants';

export interface IShowProps {
  clicks?: number;
  content?: string;
}

export const Show: React.FunctionComponent<React.PropsWithChildren<IShowProps>> = ({
  clicks = 1,
  content = '',
}: React.PropsWithChildren<IShowProps>) => {
  const [, setCount] = React.useState<number>(0);
  const [visible, setVisible] = React.useState(false);

  const handleEvent = React.useCallback((event: KeyboardEvent | MouseEvent) => {
    const isKeyPress = event instanceof KeyboardEvent && event.key === 'ArrowRight';
    const isClick = event instanceof MouseEvent;

    if (isKeyPress || isClick) {
      setCount((prevCount) => {
        const newCount = prevCount + 1;
        if (newCount === clicks) {
          event.preventDefault();
          setVisible(true);
        }

        if (newCount >= clicks) {
          window.removeEventListener('keydown', handleEvent);
          window.removeEventListener('click', handleEvent);
          messageHandler.send(WebViewMessages.toVscode.setHasClickListener, false);
        }

        return newCount;
      });
    }
  }, [clicks]);

  React.useEffect(() => {
    setCount(0);
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, true);
    window.addEventListener('keydown', handleEvent);
    window.addEventListener('click', handleEvent);

    return () => {
      messageHandler.send(WebViewMessages.toVscode.setHasClickListener, false);
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('click', handleEvent);
    };
  }, [clicks]);

  console.log('Nr of clicks', clicks);

  if (!content) {
    return null;
  }

  return visible ? <div dangerouslySetInnerHTML={{ __html: content as string }} /> : null;
};


class ShowWebComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  private rootElm: Root | null = null;
  private rootObserver: MutationObserver | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    // Create a ShadowDOM
    this.root = this.attachShadow({ mode: 'open' });

    // Create a mount element
    const mountPoint = document.createElement('div');
    this.root.appendChild(mountPoint);

    this.rootElm = createRoot(mountPoint);
    this.renderComponent(this.getAttribute('clicks'));

    const mutationObserver: MutationCallback = (mutationList: MutationRecord[], observer: MutationObserver) => {
      for (const m of mutationList) {
        if (m.target === this) {
          this.renderComponent(this.getAttribute('clicks'));
        }
      }
    };

    this.rootObserver = new MutationObserver(mutationObserver);
    this.rootObserver.observe(this, {
      childList: true, subtree: true
    });
  }

  attributeChangedCallback() {
    this.renderComponent(this.getAttribute('clicks'));
  }

  static get observedAttributes() {
    return ['clicks'];
  }

  renderComponent(clicks: string | null | undefined = null) {
    if (this.rootElm) {
      const parsedClicks = clicks ? parseInt(clicks, 10) : undefined;
      this.rootElm.render(<Show clicks={parsedClicks} content={this.innerHTML}></Show>);
    }
  }

  disconnectedCallback() {
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, false);
    if (this.rootElm) {
      this.rootElm.unmount();
    }

    if (this.rootObserver) {
      this.rootObserver.disconnect();
    }
  }
}

customElements.define('dt-show', ShowWebComponent);