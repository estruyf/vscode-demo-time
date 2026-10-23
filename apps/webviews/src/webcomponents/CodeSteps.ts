import {
  getCodeStepIndex,
  getCodeStepsLastClick,
  isAllLinesRange,
  parseLineRange,
} from '@demotime/common';
import { isStaticElement, registerClickSteps } from './clickSteps';

/**
 * Steps through the line highlights of a code block, like ` ```ts {1-2|4-6|all} `.
 *
 * The `rehypeCodeSteps` plugin wraps the code block in this element. Each click step highlights
 * the lines of the next range and dims the other lines. Static renders (the PDF export and the
 * slide thumbnails) keep the highlight of the last step, which the plugin already applied.
 */
class CodeStepsWebComponent extends HTMLElement {
  private unregister: (() => void) | undefined;
  private observer: MutationObserver | undefined;
  private crntStep = 0;

  connectedCallback() {
    this.style.display = 'block';

    if (isStaticElement(this)) {
      return;
    }

    const steps = this.getSteps();
    if (steps.length < 2) {
      return;
    }

    const clicks = this.getClicks();
    this.unregister = registerClickSteps(getCodeStepsLastClick(steps.length, clicks), (step) => {
      this.crntStep = step;
      this.apply();
    });

    // The code can render again, for instance when the slide changes in the editor
    this.observer = new MutationObserver(() => this.apply());
    this.observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.unregister?.();
    this.unregister = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private getSteps() {
    return (this.getAttribute('steps') || '').split('|').map((step) => step.trim());
  }

  private getClicks() {
    const clicks = parseInt(this.getAttribute('clicks') || '1', 10);
    return Number.isNaN(clicks) || clicks < 1 ? 1 : clicks;
  }

  private apply() {
    const steps = this.getSteps();
    const range = steps[getCodeStepIndex(this.crntStep, steps.length, this.getClicks())] ?? '';
    const lines = isAllLinesRange(range) ? undefined : parseLineRange(range);

    // Pause the observer, the attribute changes don't need another update
    this.observer?.disconnect();

    this.toggleAttribute('data-focus', !!lines);
    this.querySelectorAll('code').forEach((code) => {
      Array.from(code.querySelectorAll(':scope > [data-line]')).forEach((line, idx) => {
        line.toggleAttribute('data-highlighted-line', !!lines && lines.includes(idx + 1));
      });
    });

    this.observer?.observe(this, { childList: true, subtree: true });
  }
}

if (!customElements.get('dt-code-steps')) {
  customElements.define('dt-code-steps', CodeStepsWebComponent);
}
