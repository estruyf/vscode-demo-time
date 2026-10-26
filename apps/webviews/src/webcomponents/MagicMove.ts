import { getCodeStepIndex, getCodeStepsLastClick, MAGIC_MOVE_DURATION } from '@demotime/common';
import { MagicMoveRenderer } from 'shiki-magic-move/renderer';
import type { KeyedTokensInfo } from 'shiki-magic-move/types';
import { getReducedMotion } from '../utils/reducedMotion';
import { isStaticElement, registerClickSteps } from './clickSteps';

const CODE_CLASS = 'dt-magic-move__code';

/**
 * Animates the changes between the code blocks of a ` ````md magic-move ` block: tokens that stay
 * move to their new position, new tokens fade in and removed tokens fade out.
 *
 * The `rehypeMagicMove` plugin creates this element with the tokens of every step in the `steps`
 * attribute, and the highlighted last step as its content. Static renders (the PDF export and the
 * slide thumbnails) show that last step. On a slide, the element renders the current step inside
 * the `pre` of the code block, so the title and the theme's code block styles stay.
 */
class MagicMoveWebComponent extends HTMLElement {
  static observedAttributes = ['steps', 'clicks', 'duration'];

  private unregister: (() => void) | undefined;
  private observer: MutationObserver | undefined;
  private renderer: MagicMoveRenderer | undefined;
  private code: HTMLElement | undefined;
  private steps: KeyedTokensInfo[] = [];
  private crntClick = 0;
  private crntIndex: number | undefined;

  connectedCallback() {
    this.style.display = 'block';

    if (isStaticElement(this)) {
      return;
    }

    this.setup();

    // The code block can render again, for instance when the slide changes in the editor
    this.observer = new MutationObserver(() => {
      if (!this.code || this.code.parentElement !== this.querySelector('pre')) {
        this.setup();
      }
    });
    this.observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.unregister?.();
    this.unregister = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
    this.code = undefined;
    this.renderer = undefined;
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue !== newValue && this.isConnected && this.observer) {
      this.setup();
    }
  }

  private setup() {
    this.unregister?.();
    this.unregister = undefined;
    this.code?.remove();
    this.code = undefined;
    this.renderer = undefined;
    this.crntIndex = undefined;
    this.removeAttribute('data-live');

    this.steps = this.getSteps();
    const pre = this.querySelector('pre');
    if (this.steps.length < 2 || !pre) {
      return;
    }

    // The renderer owns this element, the code from the slide content is hidden with CSS
    this.code = document.createElement('code');
    this.code.className = `${CODE_CLASS} shiki-magic-move-container`;
    pre.appendChild(this.code);
    this.renderer = new MagicMoveRenderer(this.code, {
      duration: this.getDuration(),
      // The `pre` already has the background and text color of the theme
      containerStyle: false,
    });
    this.setAttribute('data-live', '');

    const clicks = this.getClicks();
    this.unregister = registerClickSteps(
      getCodeStepsLastClick(this.steps.length, clicks),
      (click) => {
        this.crntClick = click;
        this.apply();
      },
    );
  }

  private getSteps(): KeyedTokensInfo[] {
    try {
      const steps = JSON.parse(this.getAttribute('steps') || '[]');
      return Array.isArray(steps) ? steps : [];
    } catch {
      return [];
    }
  }

  private getClicks() {
    const clicks = parseInt(this.getAttribute('clicks') || '1', 10);
    return Number.isNaN(clicks) || clicks < 1 ? 1 : clicks;
  }

  private getDuration() {
    const duration = parseInt(this.getAttribute('duration') || '', 10);
    return Number.isNaN(duration) || duration < 0 ? MAGIC_MOVE_DURATION : duration;
  }

  /**
   * The scale of the slide, the renderer needs it to calculate the positions of the tokens
   */
  private getScale() {
    if (!this.code || !this.code.offsetWidth) {
      return 1;
    }
    return this.code.getBoundingClientRect().width / this.code.offsetWidth || 1;
  }

  private apply() {
    const renderer = this.renderer;
    if (!renderer) {
      return;
    }

    const index = getCodeStepIndex(this.crntClick, this.steps.length, this.getClicks());
    if (index === this.crntIndex) {
      return;
    }

    const step = this.steps[index];
    const previousIndex = this.crntIndex;
    this.crntIndex = index;

    // Animate one step forward or back, jump to other steps like the first render of the slide
    const animate =
      previousIndex !== undefined &&
      Math.abs(index - previousIndex) === 1 &&
      renderer.options.duration > 0 &&
      !getReducedMotion();

    if (animate) {
      renderer.options.globalScale = this.getScale();
      void renderer.render(step);
    } else {
      renderer.replace(step);
    }
  }
}

if (!customElements.get('dt-magic-move')) {
  customElements.define('dt-magic-move', MagicMoveWebComponent);
}
