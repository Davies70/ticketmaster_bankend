import fs from "fs/promises";
import path from "path";
// 1. Import your configured database pool
import pool from "../config/db";

async function executeMigration() {
  try {
    const sqlFilePath = path.resolve(
      __dirname,
      "../db/migrations/001_init_schema.sql",
    );
    const sqlString = await fs.readFile(sqlFilePath, "utf-8");
    console.log("File read successfully. Executing migrations...");

    // 2. Pass the entire massive string directly to the pool
    await pool.query(sqlString);

    console.log("Migrations executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    // Force the process to exit with an error code so CI/CD pipelines know it failed
    process.exit(1);
  } finally {
    // 3. THE LIFECYCLE TRAP: You MUST drain the pool
    // If you don't do this, your terminal will hang forever.
    await pool.end();
    console.log("Database connection closed.");
  }
}

executeMigration();
