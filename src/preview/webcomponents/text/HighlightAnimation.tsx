import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useState, useEffect, useRef, ReactNode } from 'react';

// Highlight Animation
export interface HighlightProps {
  children?: ReactNode;
  delay?: number;
  duration?: number;
  repeat?: boolean;
  highlightColor?: string;
  direction?: 'left-to-right' | 'right-to-left' | 'center-out';
  className?: string;
}

export const HighlightAnimation: React.FC<HighlightProps> = ({
  children,
  delay = 0,
  duration = 1000,
  repeat = false,
  highlightColor = '#ffff00',
  direction = 'left-to-right',
  className = '',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  let clipPath = '';
  switch (direction) {
    case 'left-to-right':
      clipPath = 'inset(0 100% 0 0)';
      break;
    case 'right-to-left':
      clipPath = 'inset(0 0 0 100%)';
      break;
    case 'center-out':
      clipPath = 'inset(0 50% 0 50%)';
      break;
    default:
      clipPath = 'inset(0 100% 0 0)';
  }

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Reset animation state
    setIsAnimating(false);

    // Start animation after delay
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(true);

      if (repeat) {
        intervalRef.current = setInterval(() => {
          setIsAnimating(false);

          setTimeout(() => {
            setIsAnimating(true);
          }, 10);
        }, duration + 1000);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [delay, duration, repeat]);

  return (
    <div
      className={`highlight-animation ${className}`}
      style={{
        display: 'inline-block',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-block',
        }}
      >
        {children}
      </div>
      <span
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: highlightColor,
          zIndex: 0,
          clipPath: isAnimating ? 'inset(0 0 0 0)' : clipPath,
          transition: isAnimating ? `clip-path ${duration}ms ease-in-out` : 'none',
        }}
      />
    </div>
  );
};

export class HighlightComponent extends HTMLElement {
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
      // Use text attribute if provided, otherwise use slot
      const props: HighlightProps = {
        delay: Number(this.getAttribute('delay')) || 0,
        duration: Number(this.getAttribute('duration')) || 1000,
        repeat: this.hasAttribute('repeat'),
        highlightColor: this.getAttribute('highlight-color') || '#ffff00',
        direction: (this.getAttribute('direction') as 'left-to-right' | 'right-to-left' | 'center-out') || 'left-to-right',
      };

      this.rootElm.render(
        <HighlightAnimation {...props}>
          <slot></slot>
        </HighlightAnimation>
      );
    }
  }

  static get observedAttributes() {
    return ['delay', 'duration', 'repeat', 'highlight-color', 'direction'];
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

customElements.define('text-highlight', HighlightComponent);