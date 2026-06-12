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
  const answers = mediaScriptArgs.answers;

  let image = sharp(imagePath);

  if (!answers) {
    let metadata = await image.metadata();
    MediaScript.askQuestions([{
      name: "width",
      message: "What is the width of the image?",
      default: `${metadata.width || 0}`
    }]);
    return;
  }

  const width = answers.width;

  if (!width) {
    MediaScript.done(`No width provided`);
    return;
  }

  const imgBuffer = await image.resize({
    width: parseInt(width)
  }).toBuffer();
  sharp(imgBuffer).toFile(imagePath);

  MediaScript.done(`Image resized to ${width}px`);
})();