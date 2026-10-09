import yaml from 'js-yaml';
import { SlideMetadata } from '../models';

/**
 * FrontMatterParser class to handle frontmatter extraction and parsing
 */
export class FrontMatterParser {
  /**
   * Extracts frontmatter from a string content
   * Supports YAML format between --- delimiters
   *
   * @param content The content to extract frontmatter from
   * @returns An object containing the frontmatter and the remaining content
   */
  public static extractFrontmatter(content: string): {
    frontmatter: SlideMetadata;
    remainingContent: string;
  } {
    // Default return values
    const result = {
      frontmatter: {} as SlideMetadata,
      remainingContent: content,
    };

    // Check for frontmatter pattern
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return result;
    }

    const [, yamlContent, remainingContent] = match;

    // An empty block (---\n---) is valid frontmatter without any properties
    if (yamlContent.trim() === '') {
      return { frontmatter: {}, remainingContent };
    }

    const parsedFrontmatter = FrontMatterParser.parseYamlMapping(yamlContent);
    if (!parsedFrontmatter) {
      return result;
    }

    return {
      frontmatter: parsedFrontmatter,
      remainingContent,
    };
  }

  /**
   * Parses YAML content and only returns it when it is a mapping (key/value object).
   * Scalars, arrays and invalid YAML are not frontmatter.
   *
   * @param yamlContent The YAML content to parse
   * @returns The parsed mapping, or undefined when the content is not a YAML mapping
   */
  public static parseYamlMapping(yamlContent: string): SlideMetadata | undefined {
    try {
      const parsed = yaml.load(yamlContent);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as SlideMetadata;
      }
    } catch {
      // Not valid YAML
    }
    return undefined;
  }

  /**
   * Parses inline frontmatter from a slide delimiter line
   * Example: "--- layout: default ---" -> { layout: "default" }
   *
   * @param delimiterContent Content inside the delimiter
   * @returns Parsed frontmatter object
   */
  public static parseInlineProps(delimiterContent?: string): SlideMetadata {
    if (!delimiterContent || delimiterContent.trim() === '') {
      return {};
    }

    try {
      // Simple key-value parsing for inline props
      // Format: "key1: value1 key2: value2"
      const propsRegex = /(\w+):\s*([^\s]+|\".+?\"|\'.+?\')/g;
      const frontmatter: SlideMetadata = {};

      let match;
      while ((match = propsRegex.exec(delimiterContent)) !== null) {
        const [, key, value] = match;

        // Remove quotes if present
        const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');

        // Convert boolean strings and numbers
        if (cleanValue === 'true') {
          frontmatter[key] = true;
        } else if (cleanValue === 'false') {
          frontmatter[key] = false;
        } else if (!isNaN(Number(cleanValue))) {
          frontmatter[key] = Number(cleanValue);
        } else {
          frontmatter[key] = cleanValue;
        }
      }

      return frontmatter;
    } catch (error) {
      console.error('Error parsing inline props:', error);
      return {};
    }
  }
}
