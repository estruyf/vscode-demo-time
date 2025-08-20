import yaml from "js-yaml";
import { SlideMetadata } from "../models";

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

    try {
      // Extract and parse the frontmatter
      const [, yamlContent, remainingContent] = match;

      // Parse YAML content
      const parsedFrontmatter = (yaml.load(yamlContent) as SlideMetadata) || {};

      return {
        frontmatter: parsedFrontmatter,
        remainingContent: remainingContent,
      };
    } catch (error) {
      console.error("Error parsing frontmatter:", error);
      return result;
    }
  }

  /**
   * Parses inline frontmatter from a slide delimiter line
   * Example: "--- layout: default ---" -> { layout: "default" }
   *
   * @param delimiterContent Content inside the delimiter
   * @returns Parsed frontmatter object
   */
  public static parseInlineProps(delimiterContent?: string): SlideMetadata {
    if (!delimiterContent || delimiterContent.trim() === "") {
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
        const cleanValue = value.replace(/^['"](.*)['"]$/, "$1");

        // Convert boolean strings and numbers
        if (cleanValue === "true") {
          frontmatter[key] = true;
        } else if (cleanValue === "false") {
          frontmatter[key] = false;
        } else if (!isNaN(Number(cleanValue))) {
          frontmatter[key] = Number(cleanValue);
        } else {
          frontmatter[key] = cleanValue;
        }
      }

      return frontmatter;
    } catch (error) {
      console.error("Error parsing inline props:", error);
      return {};
    }
  }
}
