"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// 1. Import your configured database pool
const db_1 = __importDefault(require("../config/db"));
async function executeMigration() {
    try {
        const sqlFilePath = path_1.default.resolve(__dirname, "../db/migrations/001_init_schema.sql");
        const sqlString = await promises_1.default.readFile(sqlFilePath, "utf-8");
        console.log("File read successfully. Executing migrations...");
        // 2. Pass the entire massive string directly to the pool
        await db_1.default.query(sqlString);
        console.log("Migrations executed successfully!");
    }
    catch (error) {
        console.error("Migration failed:", error);
        // Force the process to exit with an error code so CI/CD pipelines know it failed
        process.exit(1);
    }
    finally {
        // 3. THE LIFECYCLE TRAP: You MUST drain the pool
        // If you don't do this, your terminal will hang forever.
        await db_1.default.end();
        console.log("Database connection closed.");
    }
}
executeMigration();
//# sourceMappingURL=migrate.js.map