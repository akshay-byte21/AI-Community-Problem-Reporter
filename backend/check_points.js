const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkPoints() {
  try {
    const userRes = await pool.query(`SELECT id, identifier, name, points FROM users WHERE identifier = '9392671947'`);
    console.log('User:', userRes.rows);

    if (userRes.rows.length > 0) {
      const reportsRes = await pool.query(`SELECT id, status, category FROM reports WHERE user_id = $1`, [userRes.rows[0].id]);
      console.log('Reports for user:', reportsRes.rows);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPoints();
