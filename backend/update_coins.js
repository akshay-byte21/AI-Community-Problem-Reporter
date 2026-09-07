const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateCoins() {
  try {
    const client = await pool.connect();
    // Ensure column exists
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;`);
    
    const res = await client.query(`UPDATE users SET points = (SELECT COUNT(*) * 50 FROM reports WHERE reports.user_id = users.id AND status = 'Solved')`);
    console.log('Successfully updated coins for already solved problems:', res.rowCount, 'users updated.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateCoins();
