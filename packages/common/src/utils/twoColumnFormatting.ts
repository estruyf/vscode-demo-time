export const twoColumnFormatting = (content: string) => {
  if (!content || !content.includes(`::right::`)) {
    return content;
  }

  const rightSplit = content.split('::right::');
  if (rightSplit.length === 2) {
    const left = rightSplit[0].trim();
    const right = rightSplit[1].trim();

    const updatedContent = `
<div class="slide__left">

${left}

</div>
<div class="slide__right">

${right}

</div>`;

    return updatedContent;
  }

  return content;
};
