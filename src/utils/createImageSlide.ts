import { Uri, workspace } from "vscode";
import { getRelPath } from "./getRelPath";
import { Logger } from "../services";

export const createImageSlide = async (imageUri: Uri, slideFolder: Uri): Promise<string | undefined> => {
  const imageName = imageUri.path.split("/").pop() || "";
  const imageNameWithoutExtension = imageName.split(".").slice(0, -1).join(".");
  const slideFileName = `${imageNameWithoutExtension}.md`;
  const slideFileUri = Uri.joinPath(slideFolder, slideFileName);
  const imageRelativePath = getRelPath(imageUri.fsPath);

  const contents = `---
theme: default
layout: image
image: ${imageRelativePath}
---`;

  try {
    await workspace.fs.writeFile(slideFileUri, Buffer.from(contents));
    const slideRelativePath = getRelPath(slideFileUri.fsPath);
    return slideRelativePath;
  } catch (error) {
    Logger.error(`Failed to create slide file: ${(error as Error).message}`);
    return undefined;
  }
};
