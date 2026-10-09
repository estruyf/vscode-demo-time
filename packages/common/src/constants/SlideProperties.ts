import { SlideLayout } from './SlideLayout';
import { SlideTheme } from './SlideTheme';
import { SlideTransition } from './SlideTransition';

export type SlidePropertyType = 'string' | 'boolean' | 'number' | 'enum' | 'file' | 'template';

/**
 * How a property in the document front matter applies to the other slides of the file:
 * - `always`: every slide uses the value of the document front matter, even when it sets its own
 * - `fallback`: every slide that doesn't set its own value uses it
 * - `firstSlide`: only the first slide uses it
 */
export type SlidePropertyInheritance = 'always' | 'fallback' | 'firstSlide';

export interface SlideProperty {
  type: SlidePropertyType;
  /**
   * What the property does, in markdown
   */
  description: string;
  /**
   * The allowed values of an `enum` property
   */
  values?: readonly string[];
  /**
   * Compare the values of an `enum` property without case
   */
  ignoreCase?: boolean;
  /**
   * A `file` property that can also be an `http(s)` URL
   */
  allowUrl?: boolean;
  /**
   * The value that Demo Time uses when the slide doesn't set the property
   */
  default?: string | number | boolean;
  /**
   * Describes the default, in markdown, when it isn't a fixed value
   */
  defaultDescription?: string;
  /**
   * The layouts that use the property. Without it, the property works with every layout.
   */
  layouts?: readonly SlideLayout[];
  inheritance: SlidePropertyInheritance;
  /**
   * The property is another spelling of this property
   */
  aliasOf?: string;
  /**
   * The documentation page of the property, relative to https://demotime.show
   */
  docs?: string;
}

const PLACEHOLDER_DOCS = '/slides/layouts/header-footer/#placeholders';
const VIDEO_DOCS = '/slides/layouts/video/';
const ANIMATED_DOCS = '/slides/layouts/animated/';

/**
 * The front matter properties that Demo Time reads from a slide. Other properties are only used
 * when a custom layout, header or footer template reads them.
 *
 * This is the source of the slide front matter JSON schema (`docs/public/slide.schema.json`), the
 * front matter reference in the documentation, and the completion, hover and diagnostics in the
 * editor. Run `npm run slides:schema` after changing it.
 */
export const SLIDE_PROPERTIES: Record<string, SlideProperty> = {
  theme: {
    type: 'enum',
    values: Object.values(SlideTheme),
    description: 'The built-in theme of the slide.',
    default: SlideTheme.default,
    inheritance: 'always',
    docs: '/slides/themes/',
  },
  layout: {
    type: 'enum',
    values: Object.values(SlideLayout),
    description: 'The layout of the slide.',
    default: SlideLayout.Default,
    inheritance: 'firstSlide',
    docs: '/slides/layouts/',
  },
  transition: {
    type: 'enum',
    values: Object.values(SlideTransition),
    description: 'The transition to show the slide with.',
    defaultDescription: 'No transition',
    inheritance: 'fallback',
    docs: '/slides/transitions/',
  },
  customTheme: {
    type: 'file',
    allowUrl: true,
    description:
      'Path (relative to the workspace folder) or URL of a CSS file with your own theme, which builds on the `theme`.',
    inheritance: 'always',
    docs: '/slides/themes/custom/',
  },
  customLayout: {
    type: 'file',
    description:
      'Path (relative to the workspace folder) of a Handlebars template with your own layout.',
    inheritance: 'firstSlide',
    docs: '/slides/layouts/custom/',
  },
  header: {
    type: 'template',
    description:
      'Handlebars template for the header of the slide. It can use the front matter properties and the header and footer placeholders.',
    defaultDescription: 'The `demoTime.slideHeaderTemplate` setting',
    inheritance: 'fallback',
    docs: '/slides/layouts/header-footer/',
  },
  footer: {
    type: 'template',
    description:
      'Handlebars template for the footer of the slide. It can use the front matter properties and the header and footer placeholders.',
    defaultDescription: 'The `demoTime.slideFooterTemplate` setting',
    inheritance: 'fallback',
    docs: '/slides/layouts/header-footer/',
  },
  progress: {
    type: 'enum',
    values: ['true', 'false', 'top', 'bottom'],
    ignoreCase: true,
    description:
      'Shows (`true`, `top` or `bottom`) or hides (`false`) the progress bar on the slide. `true` uses the position of the `demoTime.slideProgressBar` setting, or the bottom when the setting is `none`.',
    defaultDescription: 'The `demoTime.slideProgressBar` setting',
    inheritance: 'fallback',
    docs: '/slides/layouts/header-footer/#progress-bar',
  },
  title: {
    type: 'string',
    description:
      'The title of the slide in the slide navigator and overview when the slide has no heading. Header and footer templates can read it with `{{title}}`.',
    inheritance: 'fallback',
  },
  date: {
    type: 'string',
    description: 'The date that the `{{date}}` placeholder of header and footer templates shows.',
    defaultDescription: "Today's date",
    inheritance: 'fallback',
    docs: PLACEHOLDER_DOCS,
  },
  slideTitle: {
    type: 'string',
    description: 'Overrides the `{{slideTitle}}` placeholder of header and footer templates.',
    defaultDescription: 'The first heading of the slide',
    inheritance: 'fallback',
    docs: PLACEHOLDER_DOCS,
  },
  sceneTitle: {
    type: 'string',
    description: 'Overrides the `{{sceneTitle}}` placeholder of header and footer templates.',
    defaultDescription: 'The title of the scene that opens the slide',
    inheritance: 'fallback',
    docs: PLACEHOLDER_DOCS,
  },
  actTitle: {
    type: 'string',
    description: 'Overrides the `{{actTitle}}` placeholder of header and footer templates.',
    defaultDescription: 'The title of the act that opens the slide',
    inheritance: 'fallback',
    docs: PLACEHOLDER_DOCS,
  },
  presentationTitle: {
    type: 'string',
    description:
      'Overrides the `{{presentationTitle}}` placeholder of header and footer templates.',
    defaultDescription:
      'The `demoTime.presentationTitle` setting, or the name of the workspace folder',
    inheritance: 'fallback',
    docs: PLACEHOLDER_DOCS,
  },
  autoAdvanceAfter: {
    type: 'number',
    description: 'Goes to the next slide or scene after this number of seconds.',
    inheritance: 'firstSlide',
    docs: '/slides/#auto-advancing-to-the-next-slide',
  },
  hide: {
    type: 'boolean',
    description:
      'Skips the slide while presenting. A hidden slide is not counted in the slide numbers.',
    default: false,
    inheritance: 'firstSlide',
    docs: '/slides/#hiding-slides',
  },
  autoFit: {
    type: 'boolean',
    description: "Scales the content down, to at least 50%, when it doesn't fit on the slide.",
    default: false,
    inheritance: 'fallback',
    docs: '/slides/#content-that-doesnt-fit',
  },
  image: {
    type: 'file',
    allowUrl: true,
    description:
      'Path (relative to the workspace folder) or URL of an image. The `image-left` and `image-right` layouts show it next to the content, the other layouts as the background of the slide.',
    inheritance: 'firstSlide',
    docs: '/slides/layouts/image/',
  },
  background: {
    type: 'string',
    description:
      'The background of the slide: a CSS colour (`"#1e3a8a"`), a gradient (`"linear-gradient(135deg, #1e3a8a, #9333ea)"`), or the path (relative to the workspace folder) or URL of an image. Put a value with a `#` between quotes. An `image` that the layout shows as the background takes precedence.',
    defaultDescription: 'The background of the theme',
    inheritance: 'fallback',
    docs: '/slides/#slide-background-and-classes',
  },
  class: {
    type: 'string',
    description:
      'One or more CSS classes, separated by spaces, that are added to the `.slide__layout` element of the slide, so a custom theme can style it.',
    inheritance: 'fallback',
    docs: '/slides/#slide-background-and-classes',
  },
  // Video layout
  video: {
    type: 'file',
    allowUrl: true,
    description:
      'Path (relative to the workspace folder) or URL of the video. A custom layout can use it too.',
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    docs: VIDEO_DOCS,
  },
  controls: {
    type: 'boolean',
    description:
      'Shows the video controls. Without controls, the video plays as a muted background that loops.',
    default: false,
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    docs: VIDEO_DOCS,
  },
  autoplay: {
    type: 'boolean',
    description:
      'Starts the video, or the drawing of the animated SVG, when the slide opens. A video that starts automatically is muted.',
    defaultDescription: '`true`, or `false` for a video with `controls`',
    layouts: [SlideLayout.Video, SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
  },
  autoPlay: {
    type: 'boolean',
    description: 'Another spelling of `autoplay` for the video layout.',
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    aliasOf: 'autoplay',
    docs: VIDEO_DOCS,
  },
  loop: {
    type: 'boolean',
    description: 'Loops a video with `controls`. A video without controls always loops.',
    default: false,
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    docs: VIDEO_DOCS,
  },
  muted: {
    type: 'boolean',
    description:
      "Mutes a video with `controls` that doesn't start automatically. Other videos are always muted.",
    default: false,
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    docs: VIDEO_DOCS,
  },
  playsInline: {
    type: 'boolean',
    description:
      'Plays a video with `controls` inline on mobile devices instead of full screen. A video without controls always plays inline.',
    default: false,
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    docs: VIDEO_DOCS,
  },
  playbackRate: {
    type: 'number',
    description: 'The playback speed of the video, like `0.5` or `2`.',
    default: 1,
    layouts: [SlideLayout.Video],
    inheritance: 'fallback',
    docs: VIDEO_DOCS,
  },
  // Animated SVG layout
  svgFile: {
    type: 'file',
    description: 'Path (relative to the workspace folder) of the SVG file to draw. Required.',
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
  animationSpeed: {
    type: 'number',
    description: 'Drawing speed in pixels per second. Higher values draw faster.',
    default: 100,
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
  textTypeWriterEffect: {
    type: 'boolean',
    description: 'Types the text of the SVG character by character.',
    default: true,
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
  textTypeWriterSpeed: {
    type: 'number',
    description: 'Typing speed in milliseconds per character. Lower values type faster.',
    default: 20,
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
  skipAnimation: {
    type: 'boolean',
    description: 'Shows the complete SVG right away, without drawing it.',
    default: false,
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
  invertLightAndDarkColours: {
    type: 'boolean',
    description: 'Inverts the light and dark colours of the SVG, for contrast on a dark theme.',
    default: false,
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
  controlsPosition: {
    type: 'enum',
    values: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'none'],
    description: 'The position of the play, reset and skip controls, or `none` to hide them.',
    default: 'bottomRight',
    layouts: [SlideLayout.AnimatedSVG],
    inheritance: 'fallback',
    docs: ANIMATED_DOCS,
  },
};

/**
 * Gets how a property in the document front matter applies to the other slides of the file.
 * Properties that Demo Time doesn't know, like the ones of a custom layout, are a fallback.
 */
export const getSlidePropertyInheritance = (key: string): SlidePropertyInheritance =>
  Object.prototype.hasOwnProperty.call(SLIDE_PROPERTIES, key)
    ? SLIDE_PROPERTIES[key].inheritance
    : 'fallback';
