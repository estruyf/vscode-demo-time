import { htmlDecode } from '@demotime/common';
import mermaid, { RenderResult } from 'mermaid';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { v4 as uuidv4 } from "uuid";

export interface MermaidProps {
  graphData?: string;
  id: string;
  dark: boolean;
}

export const Mermaid: React.FC<MermaidProps> = ({ graphData, id, dark }) => {
  const [element, setElement] = useState<HTMLDivElement>();
  const [render_result, setRenderResult] = useState<RenderResult>();

  const updateDiagramRef = useCallback((elem: HTMLDivElement) => {
    if (!elem) {
      return;
    }
    setElement(elem);
  }, []);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      logLevel: 5,
      darkMode: dark,
      theme: dark ? 'dark' : 'default',
    });
  }, [dark]);

  useEffect(() => {
    if (!element) {
      return;
    }
    if (!render_result?.svg) {
      return;
    }

    element.innerHTML = render_result.svg;
    render_result.bindFunctions?.(element);
  }, [element, render_result]);

  useEffect(() => {
    if (graphData?.length === 0) {
      return;
    }

    (async () => {
      try {
        const rr = await mermaid.render(`${id}-svg`, graphData as string);
        setRenderResult(rr);
      } catch (e: any) {
        console.log(`Error rendering mermaid diagram: ${(e as Error).message}`,);
      }
    })();
  }, [graphData]);

  return (
    <div
      ref={updateDiagramRef}
      id={id}
    />
  );
};

export class MermaidComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  private rootElm: Root | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.root = this.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    this.root.appendChild(mountPoint);
    this.rootElm = createRoot(mountPoint);
    this.renderComponent();
  }

  renderComponent() {
    if (this.rootElm) {
      const id = this.getAttribute('id') || uuidv4();
      const code = this.getAttribute('code') || '';
      const dark = this.hasAttribute('dark');

      this.rootElm.render(
        <Mermaid graphData={htmlDecode(code)} id={id} dark={dark} />
      );
    }
  }

  attributeChangedCallback() {
    this.renderComponent();
  }

  static get observedAttributes() {
    return ['id', 'code', 'dark'];
  }

  disconnectedCallback() {
    if (this.rootElm) {
      this.rootElm.unmount();
    }
  }
}

customElements.define('dt-mermaid', MermaidComponent);