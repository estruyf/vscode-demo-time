import {
  css,
  html,
  LitElement
} from 'https://esm.run/lit';

/**
 * The `dt-highlight` component allows you to highlight text with customizable properties:
 *
 * ```html title="Highlight text"
 * <dt-highlight 
 *   color="#ffd43b" 
 *   text-color="#000000" 
 *   padding="0.25rem">
 *   This text will be highlighted
 * </dt-highlight>
 * ```
 *
 * Properties
 *
 * - `color`: Background color of the highlight
 * - `text-color`: Color of the text (optional, defaults to current text color)
 * - `padding`: Custom padding around the text (optional, defaults to 0.25rem)
 */
export class TextHighlight extends LitElement {
  static styles = css`
    .highlight {
      display: inline-block;
      padding: var(--padding, 0.25rem);
      background-color: var(--highlight-color, #ffd43b);
      color: var(--text-color, inherit);
      border-radius: 0.2rem;
    }
  `;

  static properties = {
    color: { type: String },
    textColor: { type: String, attribute: 'text-color' },
    padding: { type: String }
  };

  constructor() {
    super();
    this.color = '#ffd43b';
    this.textColor = null;
    this.padding = '0.25rem';
  }

  render() {
    const style = {
      '--highlight-color': this.color,
      '--text-color': this.textColor,
      '--padding': this.padding
    };

    return html`
      <span class="highlight" style=${Object.entries(style).map(([k,v]) => v ? `${k}:${v}` : '').join(';')}>
        <slot></slot>
      </span>
    `;
  }
}

customElements.define('dt-highlight', TextHighlight);
