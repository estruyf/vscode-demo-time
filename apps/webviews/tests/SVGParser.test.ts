/**
 * SVGParser Tests
 * Unit tests for SVG parsing functionality
 */

import { describe, it, expect } from '@jest/globals';
import { SVGParser } from '../src/utils/svg/SVGParser';

describe('SVGParser', () => {
  describe('parse', () => {
    it('should parse valid SVG with single path', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <path d="M 10 10 L 90 90" stroke="black" fill="none" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].type).toBe('path');
      expect(result.elements[0].hasStroke).toBe(true);
      expect(result.elements[0].hasFill).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed XML', () => {
      const svg = '<svg><path d="M 0 0 L 100 100"</svg>';
      
      expect(() => SVGParser.parse(svg)).toThrow('SVG parse error');
    });

    it('should flatten nested groups', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <g>
            <path d="M 0 0 L 50 50" stroke="black" />
            <g>
              <circle cx="25" cy="25" r="10" fill="red" />
            </g>
          </g>
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements).toHaveLength(2);
      expect(result.elements[0].type).toBe('path');
      expect(result.elements[1].type).toBe('circle');
    });

    it('should extract elements in document order', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="10" height="10" />
          <circle cx="5" cy="5" r="5" />
          <line x1="0" y1="0" x2="10" y2="10" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements).toHaveLength(3);
      expect(result.elements[0].type).toBe('rect');
      expect(result.elements[1].type).toBe('circle');
      expect(result.elements[2].type).toBe('line');
    });

    it('should strip script tags', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('xss')</script>
          <path d="M 0 0 L 10 10" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].type).toBe('path');
    });

    it('should strip DOCTYPE declarations', () => {
      const svg = `
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 0 L 10 10" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements).toHaveLength(1);
    });

    it('should throw error for files exceeding size limit', () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB
      const svg = `<svg>${largeContent}</svg>`;
      
      expect(() => SVGParser.parse(svg)).toThrow('SVG file too large');
    });

    it('should detect stroke and fill attributes', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="10" height="10" stroke="black" fill="red" />
          <circle cx="5" cy="5" r="5" stroke="none" fill="blue" />
          <path d="M 0 0 L 10 10" stroke="green" fill="none" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements[0].hasStroke).toBe(true);
      expect(result.elements[0].hasFill).toBe(true);
      expect(result.elements[1].hasStroke).toBe(false);
      expect(result.elements[1].hasFill).toBe(true);
      expect(result.elements[2].hasStroke).toBe(true);
      expect(result.elements[2].hasFill).toBe(false);
    });

    it('should extract text content from text elements', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <text x="10" y="10">Hello World</text>
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].type).toBe('text');
      expect(result.elements[0].textContent).toBe('Hello World');
    });

    it('should calculate viewBox from attribute', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 300 200">
          <rect x="10" y="20" width="50" height="50" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.viewBox.x).toBe(10);
      expect(result.viewBox.y).toBe(20);
      expect(result.viewBox.width).toBe(300);
      expect(result.viewBox.height).toBe(200);
    });

    it('should warn about too many elements', () => {
      // Create SVG with > 10000 elements
      const elements = Array(10001).fill('<circle cx="5" cy="5" r="1" />').join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">${elements}</svg>`;
      
      const result = SVGParser.parse(svg);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('structure');
      expect(result.errors[0].message).toContain('Too many elements');
    });
  });

  describe('extractDirectives', () => {
    it('should parse speed directives', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <!--speed:0.5-->
          <path d="M 0 0 L 100 100" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.directives).toHaveLength(1);
      expect(result.directives[0].type).toBe('speed');
      expect(result.directives[0].position).toBe(0);
      expect(result.directives[0].value).toBe(0.5);
    });

    it('should parse pause directives with units', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 0 L 50 50" />
          <!--pause:500ms-->
          <path d="M 50 50 L 100 100" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.directives).toHaveLength(1);
      expect(result.directives[0].type).toBe('pause');
      expect(result.directives[0].position).toBe(1);
      expect(result.directives[0].value).toBe(500);
    });

    it('should parse pauseUntilPlay directives', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 0 L 50 50" />
          <!--pause:untilPlay-->
          <path d="M 50 50 L 100 100" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.directives).toHaveLength(1);
      expect(result.directives[0].type).toBe('pauseUntilPlay');
      expect(result.directives[0].position).toBe(1);
    });

    it('should parse multiple directives in correct order', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <!--speed:2.0-->
          <path d="M 0 0 L 50 50" />
          <!--pause:1s-->
          <path d="M 50 50 L 100 100" />
          <!--speed:1.0-->
          <circle cx="75" cy="75" r="10" />
        </svg>
      `;
      
      const result = SVGParser.parse(svg);
      
      expect(result.directives).toHaveLength(3);
      expect(result.directives[0].type).toBe('speed');
      expect(result.directives[0].value).toBe(2.0);
      expect(result.directives[1].type).toBe('pause');
      expect(result.directives[1].value).toBe(1000); // 1s = 1000ms
      expect(result.directives[2].type).toBe('speed');
      expect(result.directives[2].value).toBe(1.0);
    });
  });
});
