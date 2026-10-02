import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { transformMarkdown } from '@demotime/common';
import { renderToString } from 'react-dom/server';
import { isStaticElement, registerClickSteps } from './clickSteps';

export interface IProgressiveListProps {
  totalItems: number;
  /**
   * The click on which the first item appears.
   */
  startClick?: number;
  /**
   * Shows all items without adding click steps, like in the slide thumbnails
   */
  isStatic?: boolean;
  children: React.ReactNode;
}

export const ProgressiveList: React.FunctionComponent<IProgressiveListProps> = ({
  totalItems,
  startClick = 1,
  isStatic = false,
  children,
}) => {
  const [step, setStep] = React.useState<number>(isStatic ? Infinity : 0);
  const firstClick = startClick > 0 ? startClick : 1;

  React.useLayoutEffect(() => {
    if (totalItems <= 0 || isStatic) {
      return;
    }

    return registerClickSteps(firstClick + totalItems - 1, setStep);
  }, [firstClick, totalItems, isStatic]);

  const visibleCount = Math.min(Math.max(step - firstClick + 1, 0), totalItems);

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

    const mutationObserver: MutationCallback = (mutationList: MutationRecord[]) => {
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

      const clicks = parseInt(this.getAttribute('clicks') || '', 10);

      this.rootElm.render(
        <ProgressiveList
          totalItems={totalItems}
          startClick={isNaN(clicks) ? undefined : clicks}
          isStatic={isStaticElement(this)}
        >
          {reactChildren}
        </ProgressiveList>
      );
    }
  }

  disconnectedCallback() {
    if (this.rootElm) {
      this.rootElm.unmount();
    }

    if (this.rootObserver) {
      this.rootObserver.disconnect();
    }
  }
}

customElements.define('dt-list', ListWebComponent);
