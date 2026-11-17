/**
 * Returns the fence (``` or ~~~) when the trimmed line opens a fenced code block.
 */
export const getOpeningFence = (trimmed: string): string | undefined =>
  /^(`{3,}|~{3,})/.exec(trimmed)?.[1];

/**
 * Checks if a line closes a code block: the same fence character, at least as long as the
 * opening fence, and nothing after it.
 */
export const isClosingFence = (trimmed: string, openingFence: string): boolean => {
  const match = /^(`{3,}|~{3,})$/.exec(trimmed);
  return !!match && match[1][0] === openingFence[0] && match[1].length >= openingFence.length;
};
