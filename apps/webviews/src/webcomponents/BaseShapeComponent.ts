import { createRoot, Root } from "react-dom/client";

export abstract class BaseShapeComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  public rootElm: Root | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.root = this.attachShadow({ mode: "open" });
    const mountPoint = document.createElement("div");
    this.root.appendChild(mountPoint);
    this.rootElm = createRoot(mountPoint);
    this.render();
  }

  abstract render(): void;

  disconnectedCallback() {
    if (this.rootElm) {
      this.rootElm.unmount();
    }
  }
}
