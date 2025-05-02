import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useState, useEffect, useRef, ReactNode } from 'react';

// Typewriter Animation
export interface TypewriterProps {
  text: string,
  fontSize?: number;
  delay?: number;
  duration?: number;
  repeat?: boolean;
  cursor?: boolean;
  cursorColor?: string;
  cursorWidth?: number;
  cursorBlinkSpeed?: number;
  className?: string;
}

export const TypewriterAnimation: React.FC<TypewriterProps> = ({
  text = '',
  fontSize = 16,
  delay = 0,
  duration = 2000,
  repeat = false,
  cursor = true,
  cursorColor = '#000',
  cursorWidth = 2,
  cursorBlinkSpeed = 500,
  className = '',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing animations
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
    if (intervalRef.current) { clearInterval(intervalRef.current); }
    if (cursorIntervalRef.current) { clearInterval(cursorIntervalRef.current); }

    // Reset displayed text
    setDisplayedText('');

    // Start animation after delay
    timeoutRef.current = setTimeout(() => {
      let currentIndex = 0;
      const charInterval = duration / text.length;

      const typeNextChar = () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.substring(0, currentIndex + 1));
          currentIndex++;
        } else if (repeat) {
          currentIndex = 0;
          setDisplayedText('');
        } else {
          if (intervalRef.current) { clearInterval(intervalRef.current); }
        }
      };

      intervalRef.current = setInterval(typeNextChar, charInterval);

      // Set up cursor blinking
      if (cursor) {
        cursorIntervalRef.current = setInterval(() => {
          setShowCursor(prev => !prev);
        }, cursorBlinkSpeed);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
      if (intervalRef.current) { clearInterval(intervalRef.current); }
      if (cursorIntervalRef.current) { clearInterval(cursorIntervalRef.current); }
    };
  }, [text, delay, duration, repeat, cursor, cursorBlinkSpeed]);

  return (
    <div
      className={`typewriter-animation ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <span>
        {displayedText}
        {cursor && showCursor && (
          <span
            style={{
              display: 'inline-block',
              width: `${cursorWidth}px`,
              height: `${fontSize * 1.2}px`,
              backgroundColor: cursorColor,
              marginLeft: '2px',
              verticalAlign: 'bottom',
            }}
          />
        )}
      </span>
    </div>
  );
};

export class TypewriterComponent extends HTMLElement {
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
      const parentFontSize = window.getComputedStyle(this.parentElement!).fontSize;

      const props: TypewriterProps = {
        text: this.innerHTML,
        fontSize: (parentFontSize ? parseFloat(parentFontSize) : 16),
        delay: Number(this.getAttribute('delay')) || 0,
        duration: Number(this.getAttribute('duration')) || 2000,
        repeat: this.hasAttribute('repeat'),
        cursor: this.hasAttribute('cursor') ? true : false,
        cursorColor: this.getAttribute('cursor-color') || '#000',
        cursorWidth: Number(this.getAttribute('cursor-width')) || 2,
        cursorBlinkSpeed: Number(this.getAttribute('cursor-blink-speed')) || 500,
      };

      this.rootElm.render(
        <TypewriterAnimation {...props} />
      );
    }
  }

  static get observedAttributes() {
    return ['delay', 'duration', 'repeat', 'cursor', 'cursor-color', 'cursor-width', 'cursor-blink-speed'];
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

customElements.define('text-typewriter', TypewriterComponent);