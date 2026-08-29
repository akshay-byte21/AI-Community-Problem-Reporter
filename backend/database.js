const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Create Users Table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )`);

      // Attempt to rename phone to identifier if it exists (for existing databases)
      db.run(`ALTER TABLE users RENAME COLUMN phone TO identifier`, (err) => {
        // Ignore error if column doesn't exist or is already renamed
      });

      // Add name column if it doesn't exist
      db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => {});

      // Add created_at column to users if it doesn't exist
      db.run(`ALTER TABLE users ADD COLUMN created_at DATETIME`, (err) => {});

      // Create Staff Table
      db.run(`CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        phone TEXT
      )`, (err) => {
        if (!err) {
          // Check if empty, then seed
          db.get("SELECT COUNT(*) as count FROM staff", [], (err, row) => {
              const departments = [
                'Municipal Corporation (Road Maintenance)',
                'Municipal Corporation (Solid Waste Management)',
                'Electricity Board / Power Distribution Department',
                'Municipal Corporation (Sanitation and Drainage Department)',
                'Municipal Corporation (Sanitation Department)',
                'Municipal Corporation (Water Supply Department)',
                'Water Supply and Sewerage Board',
                'Traffic Police Department / Road Transport Office (RTO)',
                'Municipal Corporation (Parks and Recreation Department)',
                'Animal Husbandry Department / Municipal Corporation (Veterinary Section)'
              ];
              const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Rishi', 'Karan', 'Tarun', 'Ananya', 'Diya', 'Kavya', 'Neha', 'Priya', 'Riya', 'Sanya', 'Tara', 'Rohan', 'Arjun', 'Siddharth', 'Varun', 'Yash', 'Rahul', 'Naveen', 'Ramesh', 'Suresh', 'Bhavya', 'Manish', 'Deepak'];
              const lastNames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Reddy', 'Rao', 'Iyer', 'Menon', 'Pillai', 'Nair', 'Das', 'Roy', 'Choudhury', 'Bose', 'Chatterjee', 'Joshi', 'Kulkarni', 'Deshmukh', 'Yadav'];
              
              const generatePhone = () => '9' + Math.floor(Math.random() * 900000000 + 100000000).toString();
              const generateName = () => firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];

              if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO staff (name, department, phone) VALUES (?, ?, ?)");
                departments.forEach(dept => {
                  for (let i = 0; i < 10; i++) {
                    stmt.run(generateName(), dept, generatePhone());
                  }
                });
                stmt.finalize();
              }
          });
        }
      });

      // Create Reports Table
      db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT,
        description TEXT,
        department TEXT,
        lat REAL,
        lng REAL,
        address TEXT,
        status TEXT DEFAULT 'Pending',
        image_url TEXT,
        resolution_image_url TEXT,
        assigned_staff_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (assigned_staff_id) REFERENCES staff (id)
      )`);

      // Attempt to add department column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE reports ADD COLUMN department TEXT`, (err) => {});
      
      // Attempt to add assigned_staff_id column if it doesn't exist (for existing databases)
      db.run(`ALTER TABLE reports ADD COLUMN assigned_staff_id INTEGER REFERENCES staff(id)`, (err) => {});

      // Attempt to add resolution_image_url column if it doesn't exist
      db.run(`ALTER TABLE reports ADD COLUMN resolution_image_url TEXT`, (err) => {});

      // Attempt to add specific timestamp columns
      db.run(`ALTER TABLE reports ADD COLUMN reviewed_at DATETIME`, (err) => {});
      db.run(`ALTER TABLE reports ADD COLUMN progress_at DATETIME`, (err) => {});
      db.run(`ALTER TABLE reports ADD COLUMN completed_at DATETIME`, (err) => {});
      db.run(`ALTER TABLE reports ADD COLUMN solved_at DATETIME`, (err) => {});
    });
  }
});

module.exports = db;
