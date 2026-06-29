import { Uri, WorkspaceFolder } from 'vscode';

const absoluteSchemePattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const windowsAbsolutePathPattern = /^[a-zA-Z]:[\\/]/;
const uncPathPattern = /^\\\\/;

const splitUrlParts = (url: string) => {
  let path = url;
  let query = '';
  let fragment = '';

  const fragmentIndex = path.indexOf('#');
  if (fragmentIndex >= 0) {
    fragment = path.slice(fragmentIndex + 1);
    path = path.slice(0, fragmentIndex);
  }

  const queryIndex = path.indexOf('?');
  if (queryIndex >= 0) {
    query = path.slice(queryIndex + 1);
    path = path.slice(0, queryIndex);
  }

  return { path, query, fragment };
};

export const resolveOpenWebsiteUrl = (url: string, workspaceFolder?: WorkspaceFolder): string => {
  if (absoluteSchemePattern.test(url)) {
    return url.startsWith('file:') ? Uri.parse(url).toString() : url;
  }

  if (url.startsWith('//')) {
    return url;
  }

  if (windowsAbsolutePathPattern.test(url) || uncPathPattern.test(url) || url.startsWith('/')) {
    return Uri.file(url).toString();
  }

  if (!workspaceFolder) {
    return url;
  }

  const { path, query, fragment } = splitUrlParts(url);
  return Uri.joinPath(workspaceFolder.uri, path).with({ query, fragment }).toString();
};
