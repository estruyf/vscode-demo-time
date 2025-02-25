export const twoColumnFormatting = (content: string) => {
  if (!content || !content.includes(`::right::`)) {
    return content;
  }

  const rightSplit = content.split("::right::");
  if (rightSplit.length === 2) {
    const left = rightSplit[0].trim();
    const right = rightSplit[1].trim();

    const data = left.split(`---`);
    const fm = data[1].trim();
    const leftContent = data[2].trim();

    const updatedContent = `---
${fm}
---

<div class="slide__left">

${leftContent}

</div>
<div class="slide__right">

${right}

</div>`;

    return updatedContent;
  }

  return content;
};
