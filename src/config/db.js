import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to Neon PostgreSQL database");
    client.release();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
};

export { pool, testConnection };
