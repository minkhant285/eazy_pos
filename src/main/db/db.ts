// // src/main/db.ts
// import Database, { type Database as DatabaseType } from 'better-sqlite3'
// import { join } from 'path'
// import { app } from 'electron'

// const db: DatabaseType = new Database(join(app.getPath('userData'), 'journal.db'))

// db.exec(`
//   CREATE TABLE IF NOT EXISTS journal (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name TEXT NOT NULL,
//     price REAL NOT NULL
//   )
// `)

// export default db

// import Database from 'better-sqlite3'
// import { drizzle } from 'drizzle-orm/better-sqlite3'
// import { join } from 'path'
// import { app } from 'electron'
// import * as schema from './schemas/schema'

// const sqlite = new Database(join(app.getPath('userData'), 'mkjournal.db'))

// export const db = drizzle(sqlite, { schema })


import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schemas/schema";

const sqlite = new Database("pos.db");

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
