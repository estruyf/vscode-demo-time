export type Link = { code: string; url: string; hits: number };

const links = new Map<string, Link>();

// The same URL always gets the same code.
const codeFor = (url: string) =>
  [...url]
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
    .toString(36)
    .slice(0, 6);

export function save(url: string): Link {
  const code = codeFor(url);
  const link = { code, url, hits: 0 };
  links.set(code, link);
  return link;
}

export function find(code: string): Link | undefined {
  const link = links.get(code);
  if (link) link.hits++;
  return link;
}
