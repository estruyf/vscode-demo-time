import { getSlideHeading, Slide } from '@demotime/common';

// Get a title for a slide: first H1, first heading, `title` front matter or "Slide n"
export const getSlideTitle = (slide: Slide): string => {
  const frontmatterTitle =
    typeof slide.frontmatter?.title === 'string' ? slide.frontmatter.title.trim() : undefined;

  return getSlideHeading(slide.content) || frontmatterTitle || `Slide ${slide.index + 1}`;
};
