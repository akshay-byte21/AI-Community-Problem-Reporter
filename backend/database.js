require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function initDB() {
  try {
    const client = await pool.connect();
    console.log('Connected to the PostgreSQL database on Supabase.');

    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        identifier TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Staff Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        phone TEXT
      )
    `);

    // Create Reports Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        progress_at TIMESTAMP,
        completed_at TIMESTAMP,
        solved_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (assigned_staff_id) REFERENCES staff (id)
      )
    `);

    // Enable Row Level Security to fix Supabase security alerts
    await client.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE staff ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`);

    // Seed Staff Table if empty
    const res = await client.query("SELECT COUNT(*) FROM staff");
    if (parseInt(res.rows[0].count) === 0) {
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

      for (const dept of departments) {
        for (let i = 0; i < 10; i++) {
          await client.query("INSERT INTO staff (name, department, phone) VALUES ($1, $2, $3)", [generateName(), dept, generatePhone()]);
        }
      }
      console.log('Seeded staff table.');
    }
    
    client.release();
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
