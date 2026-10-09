export const htmlDecode = (input: string): string | undefined => {
  // A textarea only decodes the entities and does not parse tags like `<br/>` into elements
  const elm = document.createElement('textarea');
  elm.innerHTML = input;
  return elm.value || undefined;
};
