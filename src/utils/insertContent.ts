import { Position, Uri, workspace, WorkspaceEdit } from "vscode";

export const insertContent = async (fileUri: Uri, position: Position, content: string) => {
  const edit = new WorkspaceEdit();
  edit.insert(fileUri, position, content);
  await workspace.applyEdit(edit);
};
