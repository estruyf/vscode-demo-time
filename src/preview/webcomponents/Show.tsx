import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WebViewMessages } from '../../constants';

export interface IClickToHideProps {
  clicks?: number;
  content?: string;
  invert?: boolean;
}

export const ClickToHide: React.FunctionComponent<React.PropsWithChildren<IClickToHideProps>> = ({
  clicks = 1,
  content = '',
  invert = false,
}: React.PropsWithChildren<IClickToHideProps>) => {
  const [, setCount] = React.useState<number>(0);
  const [visible, setVisible] = React.useState(!!invert);

  const handleEvent = React.useCallback((event: KeyboardEvent | MouseEvent) => {
    const isKeyPress = event instanceof KeyboardEvent && event.key === 'ArrowRight';
    const isClick = event instanceof MouseEvent;

    if (isKeyPress || isClick) {
      setCount((prevCount) => {
        const newCount = prevCount + 1;
        if (newCount === clicks) {
          event.preventDefault();
          setVisible(invert ? false : true);
        }

        if (newCount >= clicks) {
          window.removeEventListener('keydown', handleEvent);
          window.removeEventListener('click', handleEvent);
          messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: false });
        } else {
          messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: true });
        }

        return newCount;
      });
    }
  }, [clicks, invert]);

  React.useEffect(() => {
    setCount(0);
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: true });
    window.addEventListener('keydown', handleEvent);
    window.addEventListener('click', handleEvent);

    return () => {
      messageHandler.send(WebViewMessages.toVscode.setHasClickListener, { listening: false });
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('click', handleEvent);
    };
  }, [clicks, invert]);

  if (!content) {
    return null;
  }

  return visible ? <div dangerouslySetInnerHTML={{ __html: content as string }} /> : null;
};


abstract class BaseWebComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  private rootElm: Root | null = null;
  private rootObserver: MutationObserver | null = null;
  public invert: boolean = false;

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
      this.rootElm.render(
        <ClickToHide clicks={parsedClicks} content={this.innerHTML} invert={this.invert} />
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

class ShowWebComponent extends BaseWebComponent {
  constructor() {
    super();
    this.invert = false;
  }
}

class HideWebComponent extends BaseWebComponent {
  constructor() {
    super();
    this.invert = true;
  }
}

customElements.define('dt-show', ShowWebComponent);
customElements.define('dt-hide', HideWebComponent);