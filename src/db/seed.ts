import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function seed() {
  console.log("Seeding database...");

  // Users
  const adminPw = await bcrypt.hash("admin123", 10);
  const agentPw = await bcrypt.hash("agent123", 10);

  const users = [
    { id: "admin", name: "Jakub Moravec", email: "jakub@callflow.cz", password: adminPw, role: "admin" },
    { id: "petra", name: "Petra Nováková", email: "petra@callflow.cz", password: agentPw, role: "supervisor" },
    { id: "lucie", name: "Lucie Dvořáková", email: "lucie@callflow.cz", password: agentPw, role: "agent" },
    { id: "tomas", name: "Tomáš Kovář", email: "tomas@callflow.cz", password: agentPw, role: "agent" },
  ];

  for (const u of users) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
      args: [u.id, u.name, u.email, u.password, u.role],
    });
    console.log(`  ✓ User: ${u.name}`);
  }

  // Projects
  const projects = [
    { id: "proj_1", name: "Zlato & Komodity Fund", color: "#f0b020", product: "Komoditní fond GlobalGold", min: 100000, max: 5000000, risk: "dynamicky", horizon: "dlouhodoby", ca: 8, cs: 2, cc: 90, desc: "Investice do zlata a komoditního fondu s aktivní správou." },
    { id: "proj_2", name: "Realitní fond CZ", color: "#0ec472", product: "Český realitní fond", min: 50000, max: 2000000, risk: "vyvazeny", horizon: "strednedoby", ca: 6, cs: 2, cc: 92, desc: "Český realitní fond zaměřený na komerční nemovitosti." },
    { id: "proj_3", name: "Penzijní Plus", color: "#9060f0", product: "Doplňkové penzijní spoření Premium", min: 1000, max: 50000, risk: "konzervativni", horizon: "dlouhodoby", ca: 4, cs: 1, cc: 95, desc: "Doplňkové penzijní spoření s konzervativní strategií." },
  ];

  for (const p of projects) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO projects (id, name, color, product, min_investment, max_investment, risk_profile, horizon, commission_agent, commission_supervisor, commission_company, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [p.id, p.name, p.color, p.product, p.min, p.max, p.risk, p.horizon, p.ca, p.cs, p.cc, p.desc],
    });
    console.log(`  ✓ Project: ${p.name}`);
  }

  // Sample contacts
  const contacts = [
    { id: "c1", fn: "Tomáš", ln: "Kovář", phone: "+420 777 111 222", email: "tomas.kovar@email.cz", city: "Praha", proj: "proj_1", agent: "petra", stage: "zajem", value: 500000 },
    { id: "c2", fn: "Jana", ln: "Horáčková", phone: "+420 608 333 444", email: "jana.h@seznam.cz", city: "Brno", proj: "proj_1", agent: "petra", stage: "nabidka", value: 800000 },
    { id: "c3", fn: "Martin", ln: "Černý", phone: "+420 602 555 666", email: "cerny@firma.cz", city: "Ostrava", proj: "proj_1", agent: "admin", stage: "uzavreno", value: 1200000 },
    { id: "c4", fn: "Eva", ln: "Procházková", phone: "+420 773 777 888", email: "eva.p@gmail.com", city: "Plzeň", proj: "proj_2", agent: "lucie", stage: "kontaktovany", value: 200000 },
    { id: "c5", fn: "Petr", ln: "Svoboda", phone: "+420 604 999 000", email: "svoboda@work.cz", city: "Liberec", proj: "proj_2", agent: "lucie", stage: "jednani", value: 450000 },
    { id: "c6", fn: "Alena", ln: "Benešová", phone: "+420 721 222 333", email: "benesova@email.cz", city: "Hradec Králové", proj: "proj_2", agent: "admin", stage: "smlouva", value: 350000 },
    { id: "c7", fn: "Jiří", ln: "Kučera", phone: "+420 606 444 555", email: "kucera.j@post.cz", city: "Olomouc", proj: "proj_3", agent: "lucie", stage: "zajem", value: 30000 },
    { id: "c8", fn: "Lucie", ln: "Veselá", phone: "+420 775 666 777", email: "vesela@centrum.cz", city: "České Budějovice", proj: "proj_1", agent: "tomas", stage: "novy", value: 600000 },
    { id: "c9", fn: "Ondřej", ln: "Novotný", phone: "+420 603 888 999", email: "novotny@mail.cz", city: "Zlín", proj: "proj_2", agent: "petra", stage: "nabidka", value: 300000 },
    { id: "c10", fn: "Kateřina", ln: "Fialová", phone: "+420 722 000 111", email: "fialova@inbox.cz", city: "Pardubice", proj: "proj_3", agent: "admin", stage: "uzavreno", value: 100000 },
  ];

  for (const c of contacts) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO contacts (id, first_name, last_name, phone, email, city, project_id, agent_id, pipeline_stage, potential_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [c.id, c.fn, c.ln, c.phone, c.email, c.city, c.proj, c.agent, c.stage, c.value],
    });
  }
  console.log(`  ✓ ${contacts.length} contacts`);

  // Sample deals
  const deals = [
    { id: "d1", cid: "c3", aid: "admin", pid: "proj_1", product: "Komoditní fond GlobalGold", amount: 1200000, type: "jednorázová", date: "2026-02-10", note: "Velký investor", ca: 96000, cs: 24000, cc: 1080000 },
    { id: "d2", cid: "c6", aid: "admin", pid: "proj_2", product: "Český realitní fond", amount: 350000, type: "jednorázová", date: "2026-03-01", note: "Konzervativní investorka", ca: 21000, cs: 7000, cc: 322000 },
    { id: "d3", cid: "c10", aid: "admin", pid: "proj_3", product: "Doplňkové penzijní spoření Premium", amount: 100000, type: "pravidelná", date: "2026-01-15", note: "Mladá klientka", ca: 4000, cs: 1000, cc: 95000 },
  ];

  for (const d of deals) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO deals (id, contact_id, agent_id, project_id, product, amount, type, sign_date, note, commission_agent, commission_supervisor, commission_company) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [d.id, d.cid, d.aid, d.pid, d.product, d.amount, d.type, d.date, d.note, d.ca, d.cs, d.cc],
    });
  }
  console.log(`  ✓ ${deals.length} deals`);

  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:  jakub@callflow.cz / admin123");
  console.log("  Agent:  petra@callflow.cz / agent123");
}

seed().catch(console.error);
