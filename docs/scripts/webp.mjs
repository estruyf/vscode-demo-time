// @ts-check
import { MediaScript } from '@frontmatter/extensibility';
import sharp from 'sharp';

(async () => {
  const mediaScriptArgs = MediaScript.getArguments();

  if (!mediaScriptArgs) {
    MediaScript.done(`No arguments found`);
    return;
  }
  
  const imagePath = mediaScriptArgs.mediaPath;

  let image = sharp(imagePath);
  const extension = imagePath.split(`.`).pop();
  let newFilePath = imagePath.replace(`.${extension}`, `.webp`);

  await image.toFormat("webp").toFile(newFilePath);
  MediaScript.copyMetadataAndDelete(imagePath, newFilePath);
})();