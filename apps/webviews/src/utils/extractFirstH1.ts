// Extract the first heading 1 from markdown content
export const extractFirstH1 = (markdown: string): string | undefined => {
  if (!markdown) {
    return undefined;
  }

  // Split into lines and find the first line that starts with #
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }

  return undefined;
};
