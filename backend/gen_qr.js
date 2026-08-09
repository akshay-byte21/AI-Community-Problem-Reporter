const QRCode = require('qrcode');
const path = 'C:/Users/Akshay Ganesh/.gemini/antigravity/brain/009cf919-decc-4a02-aad7-4f8d050595d4/expo_qr.png';

QRCode.toFile(path, 'exp://192.168.31.33:8081', {
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}, function (err) {
  if (err) throw err;
  console.log('done');
});
