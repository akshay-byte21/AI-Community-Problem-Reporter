const Jimp = require('jimp');

async function stitchImages() {
    try {
        const image1 = await Jimp.read('C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\.user_uploaded\\media_1788796334887.jpg'); // dummy
        const image2 = await Jimp.read('C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\.user_uploaded\\media_1788796334887.jpg'); // dummy

        // Resize both images to have the same height for neat side-by-side
        image1.resize(Jimp.AUTO, 500);
        image2.resize(Jimp.AUTO, 500);

        const width = image1.bitmap.width + image2.bitmap.width;
        const height = 500;

        const composite = new Jimp(width, height, 0x00000000);
        composite.composite(image1, 0, 0);
        composite.composite(image2, image1.bitmap.width, 0);

        const buffer = await composite.getBufferAsync(Jimp.MIME_JPEG);
        
        console.log("Stitched image buffer length:", buffer.length);
        
    } catch(e) {
        console.error(e);
    }
}
stitchImages();
