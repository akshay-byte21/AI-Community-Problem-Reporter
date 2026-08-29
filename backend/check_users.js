const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');
db.all('SELECT * FROM users', (err, rows) => {
  console.log(rows);
});
