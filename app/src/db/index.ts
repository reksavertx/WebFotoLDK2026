import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
const runtimeConnectionString = connectionString ?? "mysql://webfoto:webfoto@localhost:3306/webfoto";

const globalForDb = globalThis as unknown as { pool?: mysql.Pool };
const pool = globalForDb.pool ?? mysql.createPool({ uri: runtimeConnectionString, connectionLimit: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { pool };
