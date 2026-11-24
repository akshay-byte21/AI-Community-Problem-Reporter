require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { AP_DISTRICTS } = require('./apDistricts');

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

    // Add new columns if they don't exist
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer TEXT;`);

    // Create Staff Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        phone TEXT
      )
    `);
    
    // Add columns to staff if not exists
    await client.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS push_token TEXT;`);
    await client.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS district TEXT;`);

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

    await client.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS district TEXT;`);

    // Create Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create District Admins Table for Authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS district_admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        district TEXT,
        role TEXT DEFAULT 'district_admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enable Row Level Security
    await client.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE staff ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE district_admins ENABLE ROW LEVEL SECURITY;`);

    // Performance Optimization: Add Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_identifier ON users(identifier);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_district ON reports(district);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_staff_district ON staff(district);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_assigned_staff_id ON reports(assigned_staff_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);`);

    // Seed District Admins Table
    const adminCheck = await client.query("SELECT COUNT(*) FROM district_admins");
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('Seeding District Admins for all 26 AP Districts and Super Admin...');
      const defaultPasswordHash = await bcrypt.hash('admin123', 10);
      
      // 1. Super Admin
      await client.query(
        "INSERT INTO district_admins (username, password, district, role) VALUES ($1, $2, $3, $4)",
        ['admin', defaultPasswordHash, null, 'super_admin']
      );

      // 2. 26 District Admins
      for (const d of AP_DISTRICTS) {
        const username = `admin_${d.code}`;
        const pwd = `${d.code}@123`;
        const pwdHash = await bcrypt.hash(pwd, 10);
        await client.query(
          "INSERT INTO district_admins (username, password, district, role) VALUES ($1, $2, $3, $4)",
          [username, pwdHash, d.name, 'district_admin']
        );
      }
      console.log('Successfully seeded 26 AP District Admins + Super Admin.');
    }

    // Distribute/Seed Staff across the 26 Districts
    const staffCheck = await client.query("SELECT COUNT(*) FROM staff WHERE district IS NULL OR district = ''");
    if (parseInt(staffCheck.rows[0].count) > 0) {
      console.log('Assigning existing unassigned staff across the 26 AP districts...');
      const allStaff = await client.query("SELECT id FROM staff WHERE district IS NULL OR district = ''");
      for (let i = 0; i < allStaff.rows.length; i++) {
        const assignedDistrict = AP_DISTRICTS[i % AP_DISTRICTS.length].name;
        await client.query("UPDATE staff SET district = $1 WHERE id = $2", [assignedDistrict, allStaff.rows[i].id]);
      }
    }

    // Ensure all 26 districts have at least a few staff members
    for (const d of AP_DISTRICTS) {
      const dStaffCount = await client.query("SELECT COUNT(*) FROM staff WHERE district = $1", [d.name]);
      if (parseInt(dStaffCount.rows[0].count) === 0) {
        const sampleDepts = [
          'Municipal Corporation (Road Maintenance)',
          'Municipal Corporation (Solid Waste Management)',
          'Electricity Board / Power Distribution Department',
          'Municipal Corporation (Sanitation Department)',
          'Municipal Corporation (Water Supply Department)'
        ];
        const sampleNames = ['Suresh Babu', 'Venkat Rao', 'Kishore Kumar', 'Lakshmi Narayana', 'Praveen Reddy'];
        for (let j = 0; j < sampleDepts.length; j++) {
          const phone = '9' + Math.floor(Math.random() * 900000000 + 100000000).toString();
          await client.query(
            "INSERT INTO staff (name, department, phone, district) VALUES ($1, $2, $3, $4)",
            [`${sampleNames[j]} (${d.code.toUpperCase()})`, sampleDepts[j], phone, d.name]
          );
        }
      }
    }

    // Default any reports with NULL district to Visakhapatnam
    await client.query("UPDATE reports SET district = 'Visakhapatnam' WHERE district IS NULL OR district = ''");

    // Ensure a citizen user exists for linking seeded complaints
    let defaultUserId = 1;
    const userCheck = await client.query("SELECT id FROM users LIMIT 1");
    if (userCheck.rows.length === 0) {
      const dummyPwd = await bcrypt.hash('citizen123', 10);
      const newUser = await client.query(
        "INSERT INTO users (identifier, password, name, points) VALUES ($1, $2, $3, $4) RETURNING id",
        ['citizen@ap.gov.in', dummyPwd, 'Citizen User', 100]
      );
      defaultUserId = newUser.rows[0].id;
    } else {
      defaultUserId = userCheck.rows[0].id;
    }

    // Seed realistic active complaints for ALL 26 districts that have 0 reports
    console.log('Checking active complaints distribution across all 26 AP districts...');
    for (const d of AP_DISTRICTS) {
      const rCheck = await client.query(
        "SELECT COUNT(*) FROM reports WHERE LOWER(TRIM(district)) = LOWER(TRIM($1))", 
        [d.name]
      );

      if (parseInt(rCheck.rows[0].count) === 0) {
        console.log(`Seeding active complaints for district: ${d.name} (${d.hq})`);

        // Fetch staff in this district to assign to in-progress issues
        const staffRes = await client.query(
          "SELECT id, department FROM staff WHERE LOWER(TRIM(district)) = LOWER(TRIM($1))", 
          [d.name]
        );
        const staffList = staffRes.rows;

        const sampleIssues = [
          {
            category: 'Road Damage',
            description: `Major road breakdown with dangerous potholes causing severe traffic disruption and 2-wheeler accidents near ${d.hq} main junction.`,
            department: 'Municipal Corporation (Road Maintenance)',
            lat: Number((d.lat + 0.0065).toFixed(4)),
            lng: Number((d.lng + 0.0052).toFixed(4)),
            address: `Main Trunk Road, Near Bus Stand, ${d.hq}, ${d.name}`,
            status: 'In Progress',
            image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop'
          },
          {
            category: 'Garbage',
            description: `Overflowing commercial municipal waste dump spilling onto public footpath, emitting foul odor near ${d.hq} daily market.`,
            department: 'Municipal Corporation (Solid Waste Management)',
            lat: Number((d.lat - 0.0078).toFixed(4)),
            lng: Number((d.lng + 0.0068).toFixed(4)),
            address: `Daily Market Center, Ward 7, ${d.hq}, ${d.name}`,
            status: 'Pending',
            image_url: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop'
          },
          {
            category: 'Street Light',
            description: `A row of 4 streetlights have been completely dark for over 3 days, causing security concerns for pedestrians at night.`,
            department: 'Electricity Board / Power Distribution Department',
            lat: Number((d.lat + 0.0038).toFixed(4)),
            lng: Number((d.lng - 0.0074).toFixed(4)),
            address: `Govt Hospital Road, ${d.hq}, ${d.name}`,
            status: 'Pending',
            image_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop'
          },
          {
            category: 'Water Supply',
            description: `Underground municipal distribution pipe burst leading to clean drinking water flooding the road and low pressure in residential lines.`,
            department: 'Municipal Corporation (Water Supply Department)',
            lat: Number((d.lat - 0.0049).toFixed(4)),
            lng: Number((d.lng - 0.0058).toFixed(4)),
            address: `Revenue Colony, 3rd Cross, ${d.hq}, ${d.name}`,
            status: 'In Progress',
            image_url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop'
          }
        ];

        for (const issue of sampleIssues) {
          const matchedStaff = staffList.find(s => s.department === issue.department) || (staffList.length > 0 ? staffList[0] : null);
          const staffId = (issue.status === 'In Progress' && matchedStaff) ? matchedStaff.id : null;

          await client.query(
            `INSERT INTO reports (
              user_id, category, description, department, lat, lng, address, 
              status, image_url, district, assigned_staff_id, created_at, progress_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
              CURRENT_TIMESTAMP - INTERVAL '1 day' * (1 + FLOOR(RANDOM() * 3)),
              CASE WHEN $8 = 'In Progress' THEN CURRENT_TIMESTAMP - INTERVAL '6 hours' ELSE NULL END
            )`,
            [
              defaultUserId, issue.category, issue.description, issue.department,
              issue.lat, issue.lng, issue.address, issue.status, issue.image_url,
              d.name, staffId
            ]
          );
        }
      }
    }
    console.log('All 26 districts verified with active complaints and assigned staff.');

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
