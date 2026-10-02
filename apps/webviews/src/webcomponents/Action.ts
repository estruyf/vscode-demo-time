import { messageHandler } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';
import { isStaticElement } from './clickSteps';

const styles = `
:host {
  display: inline-block;
  vertical-align: middle;
}

:host([hidden]) {
  display: none;
}

.dt-action {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font: inherit;
  cursor: pointer;
}

.dt-action--button {
  padding: var(--demotime-action-padding, 0.4em 1em);
  font-size: var(--demotime-action-font-size, 0.9em);
  font-weight: var(--demotime-action-font-weight, 600);
  color: var(--demotime-action-color, var(--vscode-button-foreground, #ffffff));
  background: var(--demotime-action-background, var(--demotime-link-color, var(--vscode-button-background, #0e639c)));
  border: var(--demotime-action-border, 1px solid transparent);
  border-radius: var(--demotime-action-radius, 0.375em);
  box-shadow: var(--demotime-action-shadow, none);
  transition: opacity 150ms ease-in-out;
}

.dt-action--button:hover {
  opacity: var(--demotime-action-hover-opacity, 0.85);
}

.dt-action--link {
  color: var(--demotime-action-link-color, var(--demotime-link-color, var(--vscode-textLink-foreground)));
  text-decoration: underline;
}

.dt-action--link:hover {
  color: var(--demotime-action-link-hover-color, var(--demotime-link-active-color, var(--vscode-textLink-activeForeground)));
}

.dt-action:focus-visible {
  outline: 2px solid var(--demotime-action-focus-color, var(--vscode-focusBorder, currentColor));
  outline-offset: 2px;
}

:host([data-static]) .dt-action {
  cursor: default;
}

:host([data-static]) .dt-action--button:hover {
  opacity: 1;
}
`;

/**
 * `<dt-action id="scene-id">Label</dt-action>`
 *
 * Runs the scene with the given id, like the `runById` command. Renders as a button, or as a link
 * with `variant="link"`. In static rendering (PDF export) it only shows the button or link.
 */
class ActionWebComponent extends HTMLElement {
  private button: HTMLButtonElement | null = null;
  private fallback: HTMLSpanElement | null = null;

  static get observedAttributes() {
    return ['id', 'variant'];
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = styles;

      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.addEventListener('click', this.onClick);

      // Shows the id when there is no label
      this.fallback = document.createElement('span');
      const slot = document.createElement('slot');
      slot.appendChild(this.fallback);
      this.button.appendChild(slot);

      root.append(style, this.button);
    }

    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    if (!this.button || !this.fallback) {
      return;
    }

    const isStatic = isStaticElement(this);
    const variant = this.getAttribute('variant') === 'link' ? 'link' : 'button';

    this.button.className = `dt-action dt-action--${variant}`;
    this.button.setAttribute('part', `${variant} action`);
    this.fallback.textContent = this.getSceneId() || '';
    this.toggleAttribute('data-static', isStatic);

    if (isStatic) {
      this.button.tabIndex = -1;
    } else {
      this.button.removeAttribute('tabindex');
    }
  }

  private getSceneId() {
    return this.getAttribute('id')?.trim();
  }

  private onClick = (event: MouseEvent) => {
    event.preventDefault();

    const id = this.getSceneId();
    if (!id || isStaticElement(this)) {
      return;
    }

    // Avoid running the scene again when a clicker sends Enter or Space to the focused button
    this.button?.blur();
    messageHandler.send(WebViewMessages.toVscode.preview.runById, id);
  };
}

customElements.define('dt-action', ActionWebComponent);
