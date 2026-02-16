/**
 * DirectiveParser Tests
 * Unit tests for SVG XML comment directive parsing
 */

import { describe, it, expect } from '@jest/globals';
import { DirectiveParser } from '../src/utils/svg/DirectiveParser';

describe('DirectiveParser', () => {
  describe('parse', () => {
    it('should parse speed directive with valid value', () => {
      const comment = document.createComment('speed:0.5');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('speed');
      expect(directive?.value).toBe(0.5);
      expect(directive?.position).toBe(0);
    });

    it('should parse speed directive with integer value', () => {
      const comment = document.createComment('speed:2');
      const directive = DirectiveParser.parse(comment, 5);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('speed');
      expect(directive?.value).toBe(2);
      expect(directive?.position).toBe(5);
    });

    it('should return null for invalid speed value', () => {
      const comment = document.createComment('speed:abc');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).toBeNull();
    });

    it('should return null for negative speed value', () => {
      const comment = document.createComment('speed:-1.5');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).toBeNull();
    });

    it('should return null for zero speed value', () => {
      const comment = document.createComment('speed:0');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).toBeNull();
    });

    it('should parse pause directive with milliseconds', () => {
      const comment = document.createComment('pause:500ms');
      const directive = DirectiveParser.parse(comment, 3);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pause');
      expect(directive?.value).toBe(500);
      expect(directive?.position).toBe(3);
    });

    it('should parse pause directive with seconds', () => {
      const comment = document.createComment('pause:2s');
      const directive = DirectiveParser.parse(comment, 1);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pause');
      expect(directive?.value).toBe(2000); // 2 seconds = 2000ms
      expect(directive?.position).toBe(1);
    });

    it('should parse pause directive without unit (defaults to seconds)', () => {
      const comment = document.createComment('pause:2');
      const directive = DirectiveParser.parse(comment, 2);

      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pause');
      expect(directive?.value).toBe(2000); // 2 seconds = 2000ms
    });

    it('should parse pauseUntilPlay directive', () => {
      const comment = document.createComment('pause:untilPlay');
      const directive = DirectiveParser.parse(comment, 4);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pauseUntilPlay');
      expect(directive?.position).toBe(4);
      expect(directive?.value).toBeUndefined();
    });

    it('should handle whitespace around directives', () => {
      const comment = document.createComment('  speed:1.5  ');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('speed');
      expect(directive?.value).toBe(1.5);
    });

    it('should handle whitespace in pause directive', () => {
      const comment = document.createComment('  pause: 100ms  ');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pause');
      expect(directive?.value).toBe(100);
    });

    it('should return null for unrecognized directives', () => {
      const comment = document.createComment('unknown:value');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).toBeNull();
    });

    it('should return null for empty comment', () => {
      const comment = document.createComment('');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).toBeNull();
    });

    it('should return null for non-directive comment', () => {
      const comment = document.createComment('This is just a regular comment');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).toBeNull();
    });

    it('should handle decimal pause values with ms', () => {
      const comment = document.createComment('pause:250.5ms');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pause');
      expect(directive?.value).toBe(250.5);
    });

    it('should handle decimal pause values with s', () => {
      const comment = document.createComment('pause:1.5s');
      const directive = DirectiveParser.parse(comment, 0);
      
      expect(directive).not.toBeNull();
      expect(directive?.type).toBe('pause');
      expect(directive?.value).toBe(1500);
    });
  });
});
