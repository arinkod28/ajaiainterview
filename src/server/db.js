const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/docedit.db');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Document',
      content TEXT DEFAULT '',
      owner_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      shared_with_id TEXT NOT NULL,
      permission TEXT DEFAULT 'edit',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_id) REFERENCES users(id),
      UNIQUE(document_id, shared_with_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Seed demo users
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  
  const existingUsers = db.exec("SELECT COUNT(*) as count FROM users");
  const userCount = existingUsers[0]?.values[0][0] || 0;
  
  if (userCount === 0) {
    const hash = bcrypt.hashSync('password123', 10);
    const users = [
      { id: uuidv4(), email: 'alice@demo.com', username: 'Alice', password_hash: hash },
      { id: uuidv4(), email: 'bob@demo.com', username: 'Bob', password_hash: hash },
      { id: uuidv4(), email: 'carol@demo.com', username: 'Carol', password_hash: hash },
    ];
    
    const stmt = db.prepare("INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)");
    users.forEach(u => {
      stmt.run([u.id, u.email, u.username, u.password_hash]);
    });
    stmt.free();

    // Create a welcome document for Alice
    const docId = uuidv4();
    db.run(
      "INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)",
      [docId, 'Welcome to DocEdit', '<h2>Welcome to DocEdit!</h2><p>This is a collaborative document editor. Try these features:</p><ul><li><strong>Bold</strong>, <em>italic</em>, and <u>underline</u> formatting</li><li>Headings and lists</li><li>File uploads (.txt, .md, .docx)</li><li>Share documents with other users</li></ul><p>Start by creating a new document or editing this one.</p>', users[0].id]
    );

    console.log('Seeded demo users: alice@demo.com, bob@demo.com, carol@demo.com (password: password123)');
  }

  saveDB();
  return db;
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Helper to run queries and return results as objects
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

module.exports = { initDB, getDB, saveDB, query, run, get };
