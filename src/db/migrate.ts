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
  `CREATE TABLE IF NOT EXISTS agent_status (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES users(id) UNIQUE,
    status TEXT NOT NULL DEFAULT 'offline',
    last_change TEXT DEFAULT CURRENT_TIMESTAMP,
    current_contact_id TEXT REFERENCES contacts(id),
    today_calls INTEGER DEFAULT 0,
    today_deals INTEGER DEFAULT 0,
    today_interested INTEGER DEFAULT 0,
    session_start TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS google_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    calendar_id TEXT DEFAULT 'primary',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS calendar_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) NOT NULL,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    color TEXT DEFAULT 'accent',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id),
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
    daily_call_goal INTEGER DEFAULT 0,
    daily_deal_goal INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS campaign_agents (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    agent_id TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS dnc_list (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    reason TEXT,
    added_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS consent_log (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    detail TEXT,
    granted_by TEXT REFERENCES users(id),
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6b7280',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contact_tags (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    tag_id TEXT REFERENCES tags(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    action_value TEXT,
    active INTEGER DEFAULT 1,
    last_run TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    campaign_id TEXT REFERENCES campaigns(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL,
    secret TEXT,
    active INTEGER DEFAULT 1,
    last_triggered TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
];

// ALTER TABLE migrations (safe to re-run — errors are silently ignored)
const alterMigrations = [
  `ALTER TABLE contacts ADD COLUMN gdpr_consent INTEGER DEFAULT 0`,
  `ALTER TABLE contacts ADD COLUMN consent_date TEXT`,
  `ALTER TABLE documents ADD COLUMN file_url TEXT`,
  `ALTER TABLE documents ADD COLUMN file_size INTEGER DEFAULT 0`,
  `ALTER TABLE documents ADD COLUMN mime_type TEXT`,
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
  console.log("Running ALTER migrations...");
  for (const sql of alterMigrations) {
    try {
      await client.execute(sql);
      console.log(`  ✓ ${sql.slice(0, 60)}...`);
    } catch {
      // Column likely already exists — ignore
    }
  }
  console.log("Migrations complete.");
}

migrate().catch(console.error);
