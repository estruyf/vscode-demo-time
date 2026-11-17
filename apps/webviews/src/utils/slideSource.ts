import {
  getSlideFileIndex,
  isIncludedSlide,
  Slide,
  SlideLayout,
  isSlideHidden,
} from '@demotime/common';

/**
 * The file and index to edit a slide: a slide that the file includes with `src` lives in its own
 * file.
 *
 * @param slide The slide of the preview
 * @param relativePath The path of the file of the preview
 */
export const getSlideEditSource = (slide: Slide, relativePath: string) =>
  slide.source && isIncludedSlide(slide)
    ? { path: slide.source.path, index: slide.source.index, isIncluded: true }
    : { path: relativePath, index: getSlideFileIndex(slide), isIncluded: false };

/**
 * The `data-vscode-context` of a slide, which adds the slide items, like `Show slide contents`
 * and `Change layout`, to the context menu. A slide that the file includes with `src` only gets
 * `Show slide contents`, as the other items would change the included file.
 */
export const getSlideMenuContext = (slide: Slide, slides: Slide[], relativePath: string) => {
  const { path, index, isIncluded } = getSlideEditSource(slide, relativePath);
  const lastIndex = Math.max(...slides.map(getSlideFileIndex));
  return JSON.stringify({
    webviewSection: 'slide',
    slidePath: path,
    slideIndex: index,
    slideIncluded: isIncluded,
    slideHidden: isSlideHidden(slide),
    slideLayout: slide.frontmatter.layout || SlideLayout.Default,
    slideIsFirst: index === 0,
    slideIsLast: index === lastIndex,
  });
};
