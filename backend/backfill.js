const db = require('./database');

db.all('SELECT id, department FROM reports WHERE status = "Completed" OR status = "Solved"', (err, rows) => {
  if (!rows) return;
  rows.forEach(r => {
    db.all('SELECT id FROM staff WHERE department = ?', [r.department], (err2, staffRows) => {
      if (!staffRows || staffRows.length === 0) return;
      const randStaff = staffRows[Math.floor(Math.random() * staffRows.length)];
      db.run('UPDATE reports SET assigned_staff_id = ? WHERE id = ?', [randStaff.id, r.id], () => {
        console.log('Assigned staff ' + randStaff.id + ' to report ' + r.id);
      });
    });
  });
  setTimeout(() => db.close(), 2000);
});
