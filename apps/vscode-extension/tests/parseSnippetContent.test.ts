import { parseSnippetContent } from '../src/utils/parseSnippetContent';
import { Action } from '@demotime/common';
import { describe, it, expect } from '@jest/globals';

describe('parseSnippetContent', () => {
  describe('JSON parsing', () => {
    it('should parse valid JSON snippet content', () => {
      const jsonContent = `[
        {
          "action": "insert",
          "path": "test.ts",
          "content": "hello"
        },
        {
          "action": "highlight",
          "path": "test.ts",
          "position": "1:5"
        }
      ]`;

      const result = parseSnippetContent(jsonContent, 'snippet.json');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe(Action.Insert);
      expect(result[1].action).toBe(Action.Highlight);
    });

    it('should parse JSONC (JSON with comments)', () => {
      const jsoncContent = `[
        // First step
        {
          "action": "typeText",
          "content": "test"
        }
      ]`;

      const result = parseSnippetContent(jsoncContent, 'snippet.jsonc');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(Action.TypeText);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = `{invalid json}`;

      expect(() => {
        parseSnippetContent(invalidJson, 'snippet.json');
      }).toThrow(/Error parsing JSON snippet file/);
    });
  });

  describe('YAML parsing', () => {
    it('should parse valid YAML snippet content with .yaml extension', () => {
      const yamlContent = `- action: insert
  path: test.ts
  content: hello
- action: highlight
  path: test.ts
  position: "1:5"`;

      const result = parseSnippetContent(yamlContent, 'snippet.yaml');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe(Action.Insert);
      expect(result[1].action).toBe(Action.Highlight);
    });

    it('should parse valid YAML snippet content with .yml extension', () => {
      const yamlContent = `- action: typeText
  content: test`;

      const result = parseSnippetContent(yamlContent, 'snippet.yml');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(Action.TypeText);
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = `
      - action: test
        invalid: [unclosed`;

      expect(() => {
        parseSnippetContent(invalidYaml, 'snippet.yaml');
      }).toThrow(/Error parsing YAML snippet file/);
    });
  });

  describe('Format detection', () => {
    it('should default to JSON parsing for unknown extensions', () => {
      const jsonContent = `[{"action": "insert"}]`;

      const result = parseSnippetContent(jsonContent, 'snippet.txt');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(Action.Insert);
    });

    it('should be case-insensitive for extensions', () => {
      const yamlContent = `- action: typeText
  content: test`;

      const result = parseSnippetContent(yamlContent, 'snippet.YAML');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe(Action.TypeText);
    });
  });

  describe('Real-world snippets', () => {
    it('should parse insert_and_highlight snippet in JSON format', () => {
      const jsonContent = `[
        {
          "action": "unselect",
          "path": "{MAIN_FILE}"
        },
        {
          "action": "insert",
          "path": "{MAIN_FILE}",
          "contentPath": "{CONTENT_PATH}",
          "position": "{CONTENT_POSITION}"
        },
        {
          "action": "waitForTimeout",
          "timeout": 500
        },
        {
          "action": "highlight",
          "path": "{MAIN_FILE}",
          "position": "{HIGHLIGHT_POSITION}"
        }
      ]`;

      const result = parseSnippetContent(jsonContent, 'insert_and_highlight.json');

      expect(result).toHaveLength(4);
      expect(result[0].action).toBe(Action.Unselect);
      expect(result[1].action).toBe(Action.Insert);
      expect(result[2].action).toBe(Action.WaitForTimeout);
      expect(result[3].action).toBe(Action.Highlight);
    });

    it('should parse insert_and_highlight snippet in YAML format', () => {
      const yamlContent = `- action: unselect
  path: "{MAIN_FILE}"
- action: insert
  path: "{MAIN_FILE}"
  contentPath: "{CONTENT_PATH}"
  position: "{CONTENT_POSITION}"
- action: waitForTimeout
  timeout: 500
- action: highlight
  path: "{MAIN_FILE}"
  position: "{HIGHLIGHT_POSITION}"`;

      const result = parseSnippetContent(yamlContent, 'insert_and_highlight.yaml');

      expect(result).toHaveLength(4);
      expect(result[0].action).toBe(Action.Unselect);
      expect(result[1].action).toBe(Action.Insert);
      expect(result[2].action).toBe(Action.WaitForTimeout);
      expect(result[3].action).toBe(Action.Highlight);
    });
  });
});
