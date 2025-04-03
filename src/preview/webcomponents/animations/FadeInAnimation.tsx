import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';

// Fade In Animation
export interface FadeInProps {
  absolute?: boolean;
  children?: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
}

export const FadeInAnimation: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 1000,
  direction = 'up',
  distance = 20,
  className = '',
}) => {
  const [, setVisible] = useState(false);
  const [animation, setAnimation] = useState({
    opacity: 0,
    transform: getInitialTransform(direction, distance),
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getInitialTransform(dir: string, dist: number): string {
    switch (dir) {
      case 'up': return `translateY(${dist}px)`;
      case 'down': return `translateY(-${dist}px)`;
      case 'left': return `translateX(${dist}px)`;
      case 'right': return `translateX(-${dist}px)`;
      default: return 'translate(0, 0)';
    }
  }

  useEffect(() => {
    // Clear any existing animations
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset animation state
    setVisible(false);
    setAnimation({
      opacity: 0,
      transform: getInitialTransform(direction, distance),
    });

    // Start animation after delay
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      setAnimation({
        opacity: 1,
        transform: 'translate(0, 0)',
      });
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, duration, direction, distance]);

  return (
    <div
      className={`fade-in-animation ${className}`}
      style={{
        display: 'inline-block',
        opacity: animation.opacity,
        transform: animation.transform,
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
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
    if (this.rootElm) {
      this.rootElm.unmount();
    }
  }
}

customElements.define('fade-in', FadeInComponent);