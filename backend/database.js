const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to the PostgreSQL database.');
  
  // Run table creations
  const createTables = async () => {
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          identifier TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS staff (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          department TEXT NOT NULL,
          phone TEXT
        )
      `);

      const staffCountResult = await client.query('SELECT COUNT(*) FROM staff');
      if (parseInt(staffCountResult.rows[0].count) === 0) {
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
        console.log('Seed data inserted for staff.');
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          category TEXT,
          description TEXT,
          department TEXT,
          lat REAL,
          lng REAL,
          address TEXT,
          status TEXT DEFAULT 'Pending',
          image_url TEXT,
          assigned_staff_id INTEGER REFERENCES staff(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
    } catch (error) {
      console.error('Error setting up tables:', error);
    } finally {
      release();
    }
  };
  
  createTables();
});

// Polyfill the SQLite API to minimize server.js changes
const db = {
  get: (query, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgQuery = query.replace(/\?/g, (match, offset, string) => {
      let count = (string.substring(0, offset).match(/\?/g) || []).length + 1;
      return '$' + count;
    });
    pool.query(pgQuery, params, (err, res) => {
      if (err) return callback(err, null);
      callback(null, res.rows[0]);
    });
  },
  all: (query, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgQuery = query.replace(/\?/g, (match, offset, string) => {
      let count = (string.substring(0, offset).match(/\?/g) || []).length + 1;
      return '$' + count;
    });
    pool.query(pgQuery, params, (err, res) => {
      if (err) return callback(err, null);
      callback(null, res.rows);
    });
  },
  run: function(query, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgQuery = query.replace(/\?/g, (match, offset, string) => {
      let count = (string.substring(0, offset).match(/\?/g) || []).length + 1;
      return '$' + count;
    });
    pool.query(pgQuery, params, (err, res) => {
      if (err) {
        if(callback) callback(err);
      } else {
        if(callback) {
          // Approximate the sqlite 'this.lastID' for INSERTs
          const mockContext = {};
          if (res.rows && res.rows.length > 0 && res.rows[0].id) {
             mockContext.lastID = res.rows[0].id;
          }
          callback.call(mockContext, null);
        }
      }
    });
  }
};

module.exports = db;
