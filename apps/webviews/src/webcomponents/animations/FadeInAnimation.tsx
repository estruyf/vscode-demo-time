import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { isStaticElement } from '../clickSteps';
import { SLIDE_ANIMATING_ATTRIBUTE } from '@demotime/common';

// Fade In Animation
export interface FadeInProps {
  absolute?: boolean;
  children?: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
  /**
   * Shows the end state without animating, like in the slide thumbnails
   */
  isStatic?: boolean;
  /**
   * Called when the content starts or stops moving
   */
  onAnimatingChange?: (animating: boolean) => void;
}

const END_STATE = { opacity: 1, transform: 'translate(0, 0)' };

function getInitialTransform(dir: string, dist: number): string {
  switch (dir) {
    case 'up': return `translateY(${dist}px)`;
    case 'down': return `translateY(-${dist}px)`;
    case 'left': return `translateX(${dist}px)`;
    case 'right': return `translateX(-${dist}px)`;
    default: return 'translate(0, 0)';
  }
}

export const FadeInAnimation: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 1000,
  direction = 'up',
  distance = 20,
  className = '',
  isStatic = false,
  onAnimatingChange,
}) => {
  const reducedMotion = useReducedMotion();
  const skipAnimation = isStatic || reducedMotion;
  const [animation, setAnimation] = useState(() =>
    skipAnimation ? END_STATE : { opacity: 0, transform: getInitialTransform(direction, distance) }
  );
  const onAnimatingChangeRef = useRef(onAnimatingChange);
  onAnimatingChangeRef.current = onAnimatingChange;

  useEffect(() => {
    // With reduced motion or static rendering, show the end state right away
    if (skipAnimation) {
      setAnimation(END_STATE);
      onAnimatingChangeRef.current?.(false);
      return;
    }

    // Reset animation state
    setAnimation({
      opacity: 0,
      transform: getInitialTransform(direction, distance),
    });
    onAnimatingChangeRef.current?.(true);

    // Start animation after delay
    const startTimer = setTimeout(() => setAnimation(END_STATE), delay);
    const endTimer = setTimeout(() => onAnimatingChangeRef.current?.(false), delay + duration);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [delay, duration, direction, distance, skipAnimation]);

  return (
    <div
      className={`fade-in-animation ${className}`}
      style={{
        display: 'inline-block',
        opacity: animation.opacity,
        transform: animation.transform,
        transition: skipAnimation ? 'none' : `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
};

export class FadeInComponent extends HTMLElement {
  private root: ShadowRoot | null = null;
  private rootElm: Root | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.style.display = 'inline-block';
    this.root = this.attachShadow({ mode: 'open' });
    const mountPoint = document.createElement('div');
    this.root.appendChild(mountPoint);
    this.rootElm = createRoot(mountPoint);
    this.render();
  }

  render() {
    if (this.rootElm) {
      const props: FadeInProps = {
        delay: Number(this.getAttribute('delay')) || 0,
        duration: Number(this.getAttribute('duration')) || 1000,
        direction: (this.getAttribute('direction') as 'up' | 'down' | 'left' | 'right' | 'none') || 'none',
        distance: Number(this.getAttribute('distance')) || 20,
        isStatic: isStaticElement(this),
        // While the content moves, the overflow check of the slide only counts this element
        onAnimatingChange: (animating) => this.toggleAttribute(SLIDE_ANIMATING_ATTRIBUTE, animating),
      };

      const absolute = this.hasAttribute('absolute');
      if (absolute) {
        const computedStyles = window.getComputedStyle(this);
        this.style.position = 'absolute';
        this.style.inset = '0';
        this.style.width = '100%';
        this.style.height = '100%';
        this.style.marginTop = `-${computedStyles.marginTop}`;
      };

      this.rootElm.render(
        <FadeInAnimation {...props}>
          <slot />
        </FadeInAnimation>
      );
    }
  }

  static get observedAttributes() {
    return ['absolute', 'delay', 'duration', 'direction', 'distance'];
  }

  attributeChangedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.removeAttribute(SLIDE_ANIMATING_ATTRIBUTE);
    if (this.rootElm) {
      this.rootElm.unmount();
    }
  }
}

customElements.define('fade-in', FadeInComponent);