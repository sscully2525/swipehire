const { Pool } = require('pg');

// Test database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:rDTDWlnTdjUHOGVMnXudaFQDYhIhckHf@postgres.railway.internal:5432/railway',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query executed:', result.rows[0]);
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();