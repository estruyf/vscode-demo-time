import { Slide } from '@demotime/common';

// Find the first H1, or else the first heading of any level, skipping fenced code blocks
const extractHeading = (markdown: string): string | undefined => {
  if (!markdown) {
    return undefined;
  }

  let firstHeading: string | undefined;
  let inCodeBlock = false;
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const match = trimmed.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
    if (match) {
      if (match[1].length === 1) {
        return match[2];
      }
      firstHeading ??= match[2];
    }
  }

  return firstHeading;
};

// Get a title for a slide: first H1, first heading, `title` front matter or "Slide n"
export const getSlideTitle = (slide: Slide): string => {
  const frontmatterTitle =
    typeof slide.frontmatter?.title === 'string' ? slide.frontmatter.title.trim() : undefined;

  return extractHeading(slide.content) || frontmatterTitle || `Slide ${slide.index + 1}`;
};
