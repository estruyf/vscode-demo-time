import { SlideLayout } from '../constants';
import { SlideMetadata } from '../models';
import { htmlEncode } from './htmlEncode';

export type SlideBackgroundStyles = Record<string, string>;

const CLASS_NAME = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;
const IMAGE_EXTENSION = /\.(apng|avif|bmp|gif|ico|jpe?g|png|svg|webp)([?#].*)?$/i;
const ABSOLUTE_URL = /^(https?:|data:)/i;

/**
 * Gets the CSS classes of the `class` front matter property, as a space separated string or a
 * list. Values that aren't a valid class name are left out.
 */
export const getSlideClassNames = (matter?: SlideMetadata): string => {
  const value = matter?.class;
  const values: unknown[] = Array.isArray(value) ? value : [value];
  const classNames = values
    .filter((item): item is string => typeof item === 'string')
    .flatMap((item) => item.split(/\s+/))
    .filter((className) => CLASS_NAME.test(className));

  return [...new Set(classNames)].join(' ');
};

/**
 * Whether the `background` front matter value is an image URL or path, instead of a CSS colour
 * or gradient.
 */
export const isSlideBackgroundImage = (background: string): boolean => {
  if (background.includes('(')) {
    // A CSS value like `linear-gradient(...)`, `rgb(...)` or `url(...)`
    return /^data:/i.test(background);
  }

  return (
    ABSOLUTE_URL.test(background) ||
    /^\.{0,2}\//.test(background) ||
    IMAGE_EXTENSION.test(background)
  );
};

/**
 * Whether the `image` front matter property is shown as the background of the slide. The
 * `image-left` and `image-right` layouts show it next to the content instead.
 */
export const isImageSlideBackground = (matter?: SlideMetadata): boolean =>
  !!matter?.image &&
  matter.layout !== SlideLayout.ImageLeft &&
  matter.layout !== SlideLayout.ImageRight;

/**
 * Gets the styles of the `background` front matter property for the `.slide__layout` element: a
 * colour, a gradient, or an image URL or path (relative to the workspace folder).
 *
 * Returns `undefined` when the slide has no background, or when its `image` is the background,
 * which takes precedence.
 *
 * @param resolveImageUrl - Turns the relative path of an image into a URL
 */
export const getSlideBackgroundStyles = (
  matter?: SlideMetadata,
  resolveImageUrl: (path: string) => string = (path) => path,
): SlideBackgroundStyles | undefined => {
  const background = typeof matter?.background === 'string' ? matter.background.trim() : '';
  if (!background || isImageSlideBackground(matter)) {
    return undefined;
  }

  if (!isSlideBackgroundImage(background)) {
    return { background };
  }

  const url = ABSOLUTE_URL.test(background) ? background : resolveImageUrl(background);
  return {
    backgroundImage: `url("${url.replace(/"/g, '%22')}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
  };
};

/**
 * Turns the styles into the value of an HTML `style` attribute.
 */
export const toStyleAttribute = (styles?: SlideBackgroundStyles): string =>
  Object.entries(styles || {})
    .map(
      ([property, value]) =>
        `${property.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}: ${htmlEncode(value)};`,
    )
    .join(' ');
