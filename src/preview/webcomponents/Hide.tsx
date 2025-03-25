import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WebViewMessages } from '../../constants';

export interface IHideProps {
  clicks?: number;
}

export const Show: React.FunctionComponent<React.PropsWithChildren<IHideProps>> = ({
  clicks = 1,
  children,
}: React.PropsWithChildren<IHideProps>) => {
  const [, setCount] = React.useState<number>(0);
  const [visible, setVisible] = React.useState(true);

  const handleEvent = React.useCallback((event: KeyboardEvent | MouseEvent) => {
    const isKeyPress = event instanceof KeyboardEvent && event.key === 'ArrowRight';
    const isClick = event instanceof MouseEvent;

    if (isKeyPress || isClick) {
      setCount((prevCount) => {
        const newCount = prevCount + 1;
        if (newCount === clicks) {
          event.preventDefault();
          setVisible(false);
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
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, true);
    window.addEventListener('keydown', handleEvent);
    window.addEventListener('click', handleEvent);

    return () => {
      messageHandler.send(WebViewMessages.toVscode.setHasClickListener, false);
      window.removeEventListener('keydown', handleEvent);
      window.removeEventListener('click', handleEvent);
    };
  }, []);

  return visible ? <div dangerouslySetInnerHTML={{ __html: children as string }} /> : null;
};


class HideWebComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  private rootElm: Root | null = null;

  constructor() {
    super();
    // Do something more
  }

  connectedCallback() {
    // Create a ShadowDOM
    this.root = this.attachShadow({ mode: 'open' });

    // Create a mount element
    const mountPoint = document.createElement('div');
    this.root.appendChild(mountPoint);

    // Retrieve properties from attributes
    const clicks = this.getAttribute('clicks');
    const parsedClicks = clicks ? parseInt(clicks, 10) : undefined;

    // Get the inner content
    const innerContent = this.innerHTML;

    // You can directly use shadow root as a mount point
    const rootElm = createRoot(mountPoint);
    rootElm.render(<Show clicks={parsedClicks}>{innerContent}</Show>);
  }

  disconnectedCallback() {
    messageHandler.send(WebViewMessages.toVscode.setHasClickListener, false);
    if (this.rootElm) {
      this.rootElm.unmount();
    }
    if (this.root) {
      this.root.innerHTML = '';
    }
  }
}

customElements.define('dt-hide', HideWebComponent);