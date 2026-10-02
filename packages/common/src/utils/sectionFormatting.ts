export const sectionFormatting = (content: string) => {
  if (!content || !content.includes(`::section::`)) {
    return content;
  }

  const sections = content.split('::section::');

  const updatedContent = sections
    .map((section, index) => {
      // Strip any ::right:: separators inside a section — they don't apply within sections
      const trimmed = section.trim().replace(/::right::/g, '');
      if (!trimmed) {
        return '';
      }

      return `
<div class="slide__section section-${index + 1}">

${trimmed}

</div>`;
    })
    .filter(Boolean)
    .join('\n');

  return updatedContent;
};
