import { Range, Uri, workspace, WorkspaceEdit } from "vscode";

export const replaceContent = async (fileUri: Uri, range: Range, content: string) => {
  const edit = new WorkspaceEdit();
  edit.replace(fileUri, range, content);
  await workspace.applyEdit(edit);
};
