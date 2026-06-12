const path = require('path');

const arguments = process.argv;

(async () => {
  if (arguments && arguments.length > 0) {
    const imagemin = (await import('imagemin')).default;
    const imageminJpegtran = (await import('imagemin-jpegtran')).default;
    const imageminPngquant = (await import('imagemin-pngquant')).default;
        
    const fileArg = arguments[3]; // The file path
  
    await imagemin([fileArg], {
      destination: path.dirname(fileArg),
      glob: false,
      plugins: [
        imageminJpegtran(),
        imageminPngquant()
      ]
    });

    console.log(`Optimized image ${path.basename(fileArg)}`)
  }
})();


// Media test: 
// - key: 0 - value: /Users/eliostruyf/.nvm/versions/node/v16.13.0/bin/node 
// - key: 1 - value: /Users/eliostruyf/blog/web-eliostruyf-hugo/scripts/media.js 
// - key: 2 - value: /Users/eliostruyf/blog/web-eliostruyf-hugo 
// - key: 3 - value: /Users/eliostruyf/blog/web-eliostruyf-hugo/uploads/2023/10/social-image-2023.png
