export const htmlDecode = (input: string): string | undefined => {
  const elm = document.createElement("div");
  elm.innerHTML = input;
  return elm.childNodes[0]?.textContent || undefined;
};
