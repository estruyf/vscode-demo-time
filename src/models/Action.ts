export type Action =
  // File
  | "create"
  | "open"
  // Code
  | "insert"
  | "highlight"
  | "replace"
  | "unselect"
  | "remove"
  | "delete";
