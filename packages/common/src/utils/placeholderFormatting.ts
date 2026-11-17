import { getOpeningFence, isClosingFence } from './codeFence';

const RIGHT = '::right::';
const SECTION = '::section::';
const MARKERS = [RIGHT, SECTION] as const;

interface Marker {
  marker: (typeof MARKERS)[number];
  start: number;
  end: number;
}

/**
 * Returns the end of the inline code that starts before `from`: a backtick string of the same
 * length, in the same paragraph. Without it, the opening backticks are plain text.
 */
const findCodeSpanEnd = (
  content: string,
  from: number,
  end: number,
  length: number,
): number | undefined => {
  const pattern = /`+|\n[ \t]*\r?\n/g;
  pattern.lastIndex = from;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) && match.index < end) {
    // A blank line ends the paragraph
    if (match[0][0] !== '`') {
      return undefined;
    }
    if (match[0].length === length) {
      return match.index + length;
    }
  }

  return undefined;
};

/**
 * Finds the markers in the text between `start` and `end`, skipping inline code.
 */
const findTextMarkers = (content: string, start: number, end: number, markers: Marker[]) => {
  let i = start;
  while (i < end) {
    const char = content[i];

    if (char === '\\') {
      i += 2;
      continue;
    }

    if (char === '`') {
      let length = 1;
      while (content[i + length] === '`') {
        length++;
      }
      i = findCodeSpanEnd(content, i + length, end, length) ?? i + length;
      continue;
    }

    const marker = MARKERS.find((m) => content.startsWith(m, i));
    if (marker) {
      markers.push({ marker, start: i, end: i + marker.length });
      i += marker.length;
      continue;
    }

    i++;
  }
};

/**
 * Finds the `::right::` and `::section::` markers, skipping the ones in a fenced code block or
 * inline code, which only show the marker. Fenced code blocks follow the rules of the slide parser.
 */
const findMarkers = (content: string): Marker[] => {
  const markers: Marker[] = [];
  // The start of the text since the last fenced code block
  let textStart = 0;
  let codeFence: string | undefined;
  let lineStart = 0;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (codeFence) {
      if (isClosingFence(trimmed, codeFence)) {
        codeFence = undefined;
        textStart = lineStart + line.length;
      }
    } else {
      const openingFence = getOpeningFence(trimmed);
      if (openingFence) {
        findTextMarkers(content, textStart, lineStart, markers);
        codeFence = openingFence;
      }
    }

    lineStart += line.length + 1;
  }

  if (!codeFence) {
    findTextMarkers(content, textStart, content.length, markers);
  }

  return markers;
};

/**
 * Splits the content between `start` and `end` into two columns when it has one `::right::` marker.
 */
const applyTwoColumn = (
  content: string,
  markers: Marker[],
  start: number,
  end: number,
): string | undefined => {
  const rightMarkers = markers.filter(
    (marker) => marker.marker === RIGHT && marker.start >= start && marker.end <= end,
  );
  if (rightMarkers.length !== 1) {
    return undefined;
  }

  const left = content.slice(start, rightMarkers[0].start).trim();
  const right = content.slice(rightMarkers[0].end, end).trim();

  return `
<div class="slide__left">

${left}

</div>
<div class="slide__right">

${right}

</div>`;
};

export const placeholderFormatting = (content: string) => {
  if (!content || (!content.includes(RIGHT) && !content.includes(SECTION))) {
    return content;
  }

  const markers = findMarkers(content);
  const sectionMarkers = markers.filter((marker) => marker.marker === SECTION);

  if (sectionMarkers.length === 0) {
    return applyTwoColumn(content, markers, 0, content.length) ?? content;
  }

  let start = 0;
  return [...sectionMarkers, undefined]
    .map((sectionMarker, index) => {
      const end = sectionMarker ? sectionMarker.start : content.length;
      const section = content.slice(start, end);
      const formatted = applyTwoColumn(content, markers, start, end) ?? section.trim();
      start = sectionMarker ? sectionMarker.end : end;

      if (!section.trim()) {
        return '';
      }

      return `
<div class="slide__section section-${index + 1}">

${formatted}

</div>`;
    })
    .filter(Boolean)
    .join('\n');
};
