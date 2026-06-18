const applyTwoColumn = (content: string): string => {
  if (!content.includes('::right::')) {
    return content;
  }

  const rightSplit = content.split('::right::');
  if (rightSplit.length === 2) {
    const left = rightSplit[0].trim();
    const right = rightSplit[1].trim();

    return `
<div class="slide__left">

${left}

</div>
<div class="slide__right">

${right}

</div>`;
  }

  return content;
};

export const placeholderFormatting = (content: string) => {
  if (!content) {
    return content;
  }

  if (content.includes(`::section::`)) {
    const sections = content.split('::section::');

    return sections
      .map((section, index) => {
        const trimmed = applyTwoColumn(section.trim());
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
  }

  return applyTwoColumn(content);
};
