const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const lat = 17.9036;
    const lng = 83.1989;
    const res = await pool.query(`
      SELECT r.id, r.category, r.lat, r.lng, u.name 
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.status != 'Solved' 
        AND r.category = 'Road'
        AND r.lat IS NOT NULL AND r.lng IS NOT NULL
        AND (
          6371 * acos(
            cos(radians($1::float)) * cos(radians(r.lat::float)) *
            cos(radians(r.lng::float) - radians($2::float)) +
            sin(radians($1::float)) * sin(radians(r.lat::float))
          )
        ) < 0.05
    `, [lat, lng]);
    console.log("Duplicates found:", res.rows);
  } catch(e) { console.error("DB Error:", e.message); }
  process.exit();
}
run();
