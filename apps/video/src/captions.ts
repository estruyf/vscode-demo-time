import { Timeline, TimelineScene } from './timeline';

export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** How long a scene title stays on screen as a caption. */
const TITLE_CUE_MS = 4000;
/** Characters per caption line and lines per cue, as subtitle guidelines suggest. */
const LINE_LENGTH = 42;
const LINES_PER_CUE = 2;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** `01:02:03,456` for SRT, `01:02:03.456` with `separator` ".". */
export const formatTimestamp = (ms: number, separator = ','): string => {
  const total = Math.max(0, Math.round(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(total % 1000, 3)}`;
};

/** `1:05` or `1:02:03`, the way YouTube reads chapters from a description. */
export const formatChapterTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

export const toSrt = (cues: Cue[]): string =>
  cues
    .map(
      (cue, idx) =>
        `${idx + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.text}\n`,
    )
    .join('\n');

const BLOCK_START = /^\s{0,3}(#{1,6}|[-*+]|\d+\.|>)\s+/;

/**
 * Plain text a viewer reads from markdown notes: no syntax, links as their text. Headings, list
 * items and paragraphs each end as a sentence, so bullet points do not run into each other.
 */
export const markdownToText = (markdown: string): string => {
  const cleaned = markdown
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1');

  const blocks: string[] = [];
  let block = '';
  for (const line of cleaned.split('\n')) {
    if (!line.trim() || BLOCK_START.test(line)) {
      blocks.push(block);
      block = '';
    }
    block += ` ${line.replace(BLOCK_START, '')}`;
  }
  blocks.push(block);

  return blocks
    .map((text) =>
      text
        .replace(/(\*\*|__|\*|_|~~)(\S[\s\S]*?\S|\S)\1/g, '$2')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .map((text) => (/[.!?:;…]$/.test(text) ? text : `${text}.`))
    .join(' ');
};

/** Wraps text into lines of at most `LINE_LENGTH` characters. */
const wrapLines = (text: string): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').filter(Boolean)) {
    if (line && line.length + 1 + word.length > LINE_LENGTH) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
};

/**
 * Splits text into cues of at most two lines. A cue ends with a sentence where it can: a
 * sentence only shares a cue with the next one when both fit together.
 */
export const splitIntoCueTexts = (text: string): string[] => {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const texts: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const combined = current ? `${current} ${sentence}` : sentence;
    if (wrapLines(combined).length <= LINES_PER_CUE) {
      current = combined;
      continue;
    }
    if (current) {
      texts.push(wrapLines(current).join('\n'));
    }
    const lines = wrapLines(sentence);
    for (let idx = 0; idx + LINES_PER_CUE < lines.length; idx += LINES_PER_CUE) {
      texts.push(lines.slice(idx, idx + LINES_PER_CUE).join('\n'));
    }
    const rest = lines.length % LINES_PER_CUE || LINES_PER_CUE;
    current = lines.slice(lines.length - rest).join(' ');
  }
  if (current) {
    texts.push(wrapLines(current).join('\n'));
  }
  return texts;
};

const titleCue = (scene: TimelineScene, offset: number): Cue => ({
  start: scene.start + offset,
  end: Math.min(scene.end, scene.start + TITLE_CUE_MS) + offset,
  text: scene.sceneTitle,
});

/**
 * Captions for the video: each scene's title for its first seconds, or with `notes`, the scene's
 * notes spread over the scene in proportion to their length.
 *
 * @param offset - Milliseconds added to every time, for a title card in front.
 * @param getNotes - Returns the plain text of a scene's notes, if it has any.
 */
export const buildCues = (
  timeline: Timeline,
  source: 'titles' | 'notes',
  offset: number,
  getNotes: (scene: TimelineScene) => string | undefined,
): Cue[] => {
  const cues: Cue[] = [];
  for (const scene of timeline.scenes) {
    if (scene.end <= scene.start) {
      continue;
    }

    const notes = source === 'notes' ? getNotes(scene) : undefined;
    const texts = notes ? splitIntoCueTexts(notes) : [];
    if (texts.length === 0) {
      cues.push(titleCue(scene, offset));
      continue;
    }

    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    const duration = scene.end - scene.start;
    let start = scene.start;
    for (const text of texts) {
      const end = start + (duration * text.length) / totalChars;
      cues.push({ start: Math.round(start) + offset, end: Math.round(end) + offset, text });
      start = end;
    }
  }
  return cues;
};

export interface Chapter {
  start: number;
  end: number;
  title: string;
}

/**
 * One chapter per scene. The first starts at 0 so the title card and lead-in belong to it, and
 * each chapter runs until the next one starts.
 */
export const buildChapters = (
  timeline: Timeline,
  offset: number,
  totalDuration: number,
): Chapter[] => {
  const scenes = timeline.scenes.filter((scene) => scene.end > scene.start);
  const multipleActs = new Set(scenes.map((scene) => scene.actIndex)).size > 1;
  return scenes.map((scene, idx) => ({
    start: idx === 0 ? 0 : scene.start + offset,
    end: idx < scenes.length - 1 ? scenes[idx + 1].start + offset : totalDuration,
    title: multipleActs ? `${scene.actTitle}: ${scene.sceneTitle}` : scene.sceneTitle,
  }));
};

const escapeMetadata = (value: string) => value.replace(/([=;#\\\n])/g, '\\$1');

/** An ffmpeg metadata file with the chapters, for `-map_chapters`. */
export const toFfmetadata = (chapters: Chapter[], title?: string): string => {
  const lines = [';FFMETADATA1'];
  if (title) {
    lines.push(`title=${escapeMetadata(title)}`);
  }
  for (const chapter of chapters) {
    lines.push(
      '',
      '[CHAPTER]',
      'TIMEBASE=1/1000',
      `START=${Math.round(chapter.start)}`,
      `END=${Math.round(chapter.end)}`,
      `title=${escapeMetadata(chapter.title)}`,
    );
  }
  return `${lines.join('\n')}\n`;
};

/** A chapter list to paste into a video description. */
export const toChapterList = (chapters: Chapter[]): string =>
  chapters.map((chapter) => `${formatChapterTime(chapter.start)} ${chapter.title}`).join('\n') +
  '\n';
