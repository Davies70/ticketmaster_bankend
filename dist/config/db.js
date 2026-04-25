"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const pool = new pg_1.Pool({
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
exports.default = pool;
//# sourceMappingURL=db.js.map