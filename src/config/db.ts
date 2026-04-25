import "dotenv/config";
import { Pool } from "pg";

/**
 * PostgreSQL database connection pool configuration.
 * Uses environment variables for database credentials with fallbacks.
 * Supports both custom DB_* variables and standard POSTGRES_* variables.
 */
const pool = new Pool({
  user: process.env.DB_USER ?? process.env.POSTGRES_USER,
  host: process.env.DB_HOST ?? process.env.POSTGRES_HOST ?? "localhost",
  database: process.env.DB_NAME ?? process.env.POSTGRES_DB,
  password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
  port: Number(process.env.DB_PORT ?? process.env.POSTGRES_PORT) || 5432,

  // Pool config
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Default export of the PostgreSQL connection pool.
 * Use this pool for executing database queries throughout the application.
 */
export default pool;
