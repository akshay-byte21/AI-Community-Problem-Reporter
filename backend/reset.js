const bcrypt = require('bcryptjs');
const db = require('./database');
bcrypt.hash('123456', 10).then(h => {
  db.run('UPDATE users SET password = ? WHERE identifier = ?', [h, '8977469807'], function(err) {
    if(err) console.error(err);
    else console.log('Password reset to 123456. Rows affected: ' + this.changes);
  });
});
