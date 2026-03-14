import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK(role IN ('admin','supervisor','agent')),
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    product TEXT,
    min_investment INTEGER,
    max_investment INTEGER,
    risk_profile TEXT,
    horizon TEXT,
    currency TEXT DEFAULT 'CZK',
    commission_agent REAL,
    commission_supervisor REAL,
    commission_company REAL,
    status TEXT DEFAULT 'active',
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT,
    project_id TEXT REFERENCES projects(id),
    agent_id TEXT REFERENCES users(id),
    uploaded_by TEXT REFERENCES users(id),
    upload_date TEXT,
    active INTEGER DEFAULT 1,
    contact_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT,
    phone_alt TEXT,
    email TEXT,
    dob TEXT,
    gender TEXT,
    address TEXT,
    city TEXT,
    zip TEXT,
    country TEXT DEFAULT 'CZ',
    project_id TEXT REFERENCES projects(id),
    agent_id TEXT REFERENCES users(id),
    database_id TEXT REFERENCES databases(id),
    pipeline_stage TEXT DEFAULT 'novy',
    hot_cold TEXT DEFAULT 'warm',
    potential_value INTEGER DEFAULT 0,
    occupation TEXT,
    competitive_intel TEXT,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_contact_date TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    agent_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    product TEXT,
    amount INTEGER,
    type TEXT,
    sign_date TEXT,
    note TEXT,
    commission_agent INTEGER,
    commission_supervisor INTEGER,
    commission_company INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    agent_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    date TEXT,
    time TEXT,
    duration INTEGER,
    type TEXT,
    result TEXT,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS callbacks (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    agent_id TEXT REFERENCES users(id),
    date TEXT,
    time TEXT,
    note TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS database_notes (
    id TEXT PRIMARY KEY,
    database_id TEXT REFERENCES databases(id),
    text TEXT NOT NULL,
    author TEXT,
    date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    deal_id TEXT REFERENCES deals(id),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'ostatni',
    uploaded_by TEXT REFERENCES users(id),
    upload_date TEXT,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS document_notes (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id),
    text TEXT NOT NULL,
    author TEXT,
    date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS compliance_log (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    agent_id TEXT REFERENCES users(id),
    type TEXT,
    detail TEXT,
    date TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contact_activity (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    agent_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    detail TEXT,
    previous_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function migrate() {
  console.log("Running migrations...");
  for (const sql of migrations) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    try {
      await client.execute(sql);
      console.log(`  ✓ ${tableName}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ${tableName}: ${msg}`);
    }
  }
  console.log("Migrations complete.");
}

migrate().catch(console.error);
