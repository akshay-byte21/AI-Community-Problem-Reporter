const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'aiproblemreporter@gmail.com',
    pass: 'ruzeaotubqmkjqmh'
  }
});
transporter.sendMail({
  from: 'aiproblemreporter@gmail.com',
  to: 'aiproblemreporter@gmail.com',
  subject: 'Test',
  text: 'Test OTP'
}).then(info => console.log('Sent: ' + info.response)).catch(console.error);
