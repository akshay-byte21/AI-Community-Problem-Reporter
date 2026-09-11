const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear reports first due to foreign key constraints
    console.log('Clearing reports table...');
    await client.query('TRUNCATE TABLE reports RESTART IDENTITY CASCADE');
    
    // Clear users
    console.log('Clearing users table (and resetting civic points)...');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    
    await client.query('COMMIT');
    console.log('Database successfully cleared of all users and reports!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error clearing database:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

clearDatabase();
