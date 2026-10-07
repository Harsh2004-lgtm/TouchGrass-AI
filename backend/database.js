const Database = require("better-sqlite3");

const db = new Database("touchgrass.db");

db.pragma("journal_mode = WAL");

db.prepare(`
  CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity TEXT NOT NULL,
    planned_time INTEGER NOT NULL,
    mission_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generated',
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log("SQLite database connected! 🗃️");

module.exports = db;