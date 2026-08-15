const QRCode = require('qrcode');
QRCode.toFile('C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\expo_qr3.png', 'exp://192.168.31.33:8081', (err) => {
  if (err) throw err;
  console.log('done');
});
