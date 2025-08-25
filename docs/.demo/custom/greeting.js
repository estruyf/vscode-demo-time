import {
  css,
  html,
  LitElement
} from 'https://esm.run/lit';

export class SimpleGreeting extends LitElement {
  static styles = css`p { 
    color: var(--vscode-badge-foreground); 
    background: var(--vscode-badge-background);
  }`;

  static properties = {
    name: {type: String},
  };

  constructor() {
    super();
    this.name = 'from Demo Time!';
  }
  
  _handleClick(e) {
    e.preventDefault();
    console.log(`Thank you for clicking me!`);
  }

  render() {
    return html`<div><p>Hello ${this.name}</p><button @click="${this._handleClick}">Click me</button></div>`;
  }
}
customElements.define('simple-greeting', SimpleGreeting);