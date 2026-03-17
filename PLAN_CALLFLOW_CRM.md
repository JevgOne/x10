# CallFlow CRM — Plan implementace po fazich

**Aktualizovano:** 2026-03-17
**Stack:** Next.js 16 + Drizzle ORM + Turso (SQLite) + Tailwind CSS 4 + Vercel
**Deploy:** x10-sage.vercel.app

---

## CO UZ FUNGUJE (postaveno)

- Autentizace (JWT, bcrypt, rate limiting, 3 role)
- Dashboard se statistikami + denni prehled operatoru (admin)
- Kontakty (CRUD, filtry, hledani, bulk prirazeni, quick call)
- Pipeline Kanban (drag & drop)
- Hovory (zapis, statistiky)
- Callbacky (CRUD, overdue detekce)
- Dealy/Obchody (CRUD, provize)
- Projekty/Kampane (CRUD, provizni schema)
- Databaze (import XLSX/DOCX/PDF, smart parsing, batch 200/req)
- Dokumenty (metadata evidence)
- Sprava uzivatelu (admin CRUD, aktivace/deaktivace)
- Activity log (automaticky zapis vsech zmen)
- **Hovorovy rezim** — fronta, skript ECG Build, 8 vysledku, wrap-up 30s, auto pipeline
- **Kalendar** — mesic/tyden/den, drag & drop callbacku, osobni poznamky, vytvareni z kalendare
- **Notifikace** — zvonecek, toast, browser push 15 min pred callbackem, polling 60s
- **Agent status** — real-time sync na backend (ready/pause/wrap_up/offline), dnesni pocitadla
- **Google Calendar backend** — OAuth + sync API (pripraveno, ceka na env vars)

---

## FAZE 1 — Profil kontaktu a zakladni UX
**Cil:** Operatori maji kompletni prehled o kontaktu na jednom miste
**Priorita:** VYSOKA

### 1.1 Detailni stranka kontaktu `/contacts/[id]`
- [ ] Kompletni profil se vsemi poli (telefon, email, adresa, poznamky)
- [ ] Casova osa vsech aktivit (hovory, zmeny fazi, dealy, poznamky, callbacky)
- [ ] Inline editace vsech poli kontaktu
- [ ] Pridavani rucnich poznamek
- [ ] Seznam hovoru, dealu, dokumentu a callbacku ke kontaktu
- [ ] Rychle akce: zapsat hovor, naplanovant callback, vytvorit deal
- [ ] Navigace zpet na seznam / dalsi kontakt

### 1.2 Globalni vyhledavani (Cmd+K)
- [ ] Modal s hledanim pres kontakty, hovory, dealy, dokumenty
- [ ] Fuzzy search nebo FTS
- [ ] Keyboard zkratky (N = novy kontakt, H = novy hovor)
- [ ] Rychly pristup k poslednim kontaktum

### 1.3 Paginace
- [ ] Server-side paginace kontaktu (stranka X z Y)
- [ ] Infinite scroll nebo tlacitka prev/next
- [ ] Celkovy pocet zaznamu z API
- [ ] Server-side sorting

### 1.4 UX vylepseni
- [ ] Breadcrumb navigace
- [ ] Error boundaries na React urovni
- [ ] Click-to-call (`tel:`) linky vsude kde je telefon
- [ ] Loading skeleton misto spinneru

---

## FAZE 2 — Kampane a pokrocile volani
**Cil:** Kampane jako aktivni entita, operatori maji pokrocilejsi nastroje
**Priorita:** VYSOKA

### 2.1 Aktivni kampane
- [ ] Casovy ramec kampane (zacatek, konec)
- [ ] Prirazeni operatoru ke kampani
- [ ] Statistiky kampane (konverze, pocet kontaktu/hovoru/dealu)
- [ ] Cile kampane s progress barem (napr. "200 hovoru denne")
- [ ] Aktivni vs. ukoncene kampane
- [ ] Filtrovani vsech dat dle kampane

### 2.2 Sprava skriptu
- [ ] CRUD hovorovych skriptu navazanych na kampan/projekt
- [ ] Admin editor skriptu (rich text nebo strukturovane sekce)
- [ ] Operator vidi skript v hovorovem rezimu automaticky dle kampane
- [ ] Vice skriptu na kampan (uvod, obhajoba namitky, closing)

### 2.3 Pokrocila fronta
- [ ] Konfigurace retry pravidel ("3x nezvedl → presun na callback")
- [ ] Automaticke presmerovani overdue callbacku
- [ ] Statistika fronty (prumerny cas na kontakt, konverze fronty)

### 2.4 Knowledge base
- [ ] Stranka s FAQ/napovedou pro operatory
- [ ] Produktove informace navazane na kampan
- [ ] Pristupne z hovoroveho rezimu

---

## FAZE 3 — Reporty a management
**Cil:** Management ma kompletni prehled, muze exportovat data
**Priorita:** STREDNI

### 3.1 Stranka /reports
- [ ] Vykon agenta (hovory/den, konverze, prumerny deal)
- [ ] Konverzni nalevka (funnel — kolik kontaktu z kazde faze)
- [ ] Denne/tydne/mesicne statistiky hovoru
- [ ] Provizni report (kolik si kdo vydelal)
- [ ] Stav databazi (vytizenost, stari kontaktu, konverze)
- [ ] Casovy filtr na vsech reportech (dnes, tyden, mesic, vlastni)

### 3.2 Export
- [ ] Export kontaktu do XLSX/CSV
- [ ] Export hovoru do XLSX/CSV
- [ ] Export dealu do XLSX/CSV
- [ ] Export reportu do PDF

### 3.3 Tym hierarchie
- [ ] Supervisor vidi jen svuj tym (ne vsechno jako admin)
- [ ] Prirazeni agentu k supervisorovi
- [ ] Supervisor dashboard s metrikami jeho tymu

### 3.4 Pokrocile statistiky
- [ ] Grafy trendu v case (chart.js nebo recharts)
- [ ] Srovnani agentu (leaderboard)
- [ ] Heat mapa — kdy se nejvice vola, nejlepsi cas

---

## FAZE 4 — Kvalita dat a compliance
**Cil:** Cistota dat, GDPR, bezpecnost
**Priorita:** STREDNI

### 4.1 Kvalita dat
- [ ] Validace telefonu (format +420 XXX XXX XXX)
- [ ] Automaticka normalizace telefonu
- [ ] Validace emailu
- [ ] Duplicitni detekce pri importu (telefon/email match)
- [ ] Merge duplicitnich kontaktu
- [ ] Tagy/stitky na kontaktech

### 4.2 DNC a blacklist
- [ ] DNC list (cisla kam se nesmi volat)
- [ ] Blacklist kontaktu
- [ ] Automaticke blokovani z fronty

### 4.3 GDPR
- [ ] Evidence souhlasu kontaktu (opt-in/opt-out)
- [ ] Export dat kontaktu (pravo na pristup)
- [ ] Smazani dat kontaktu (pravo byt zapomenut)
- [ ] Automaticka expirace souhlasu
- [ ] Evidence ucelu zpracovani

### 4.4 Bezpecnost
- [ ] Kompletni audit log (kdo, kdy, co — vsechny entity)
- [ ] Profil uzivatele — zmena hesla
- [ ] Rate limiting na write endpointy
- [ ] CSRF ochrana
- [ ] 2FA (volitelne)

---

## FAZE 5 — Integrace a dokumenty
**Cil:** Propojeni s externimi systemy, realne soubory
**Priorita:** NIZSI

### 5.1 File upload
- [ ] Upload dokumentu do cloud storage (S3/R2/Supabase)
- [ ] Nahled a stahovani souboru
- [ ] Verzovani dokumentu
- [ ] Sablony dokumentu (smlouva, nabidka s daty kontaktu)
- [ ] Prirazeni dokumentu k dealu

### 5.2 VoIP integrace
- [ ] Click-to-call pres VoIP (3CX/Daktela/Twilio)
- [ ] Automaticky zaznam hovoru z ustedny
- [ ] Nahravani hovoru a prehravani v CRM
- [ ] Screen pop pri prichozim hovoru

### 5.3 Email a SMS
- [ ] Odeslani emailu z CRM (sablony s promennymi)
- [ ] Odeslani SMS (GoSMS/eSputnik)
- [ ] Sledovani otevreni emailu
- [ ] Automaticke follow-up emaily po hovoru
- [ ] Drip kampane

### 5.4 Externi API
- [ ] REST API s dokumentaci a API klici
- [ ] Webhook endpointy
- [ ] Google Calendar sync (frontend UI — backend uz hotovy)
- [ ] Zapier/Make integrace

---

## FAZE 6 — AI a automatizace
**Cil:** Inteligentni funkce, automatizace rutinnich ukolu
**Priorita:** BUDOUCI

### 6.1 Automatizace
- [ ] Pravidla: trigger + akce (napr. "7 dni bez kontaktu → presun na COLD")
- [ ] Planovane ulohy (cron) — denni report, automaticky presun stagnujicich
- [ ] Automaticky callback pri vysledku "callback" (uz castecne v call-mode)
- [ ] Opakovane callbacky ("volat kazdy tyden")

### 6.2 AI funkce
- [ ] AI scoring kontaktu (hot/warm/cold automaticky z aktivity)
- [ ] AI sumarizace hovoru
- [ ] AI doporuceni dalsiho kroku
- [ ] Predikce pravdepodobnosti uzavreni dealu
- [ ] Sentiment analyza

### 6.3 Pokrocila analytika
- [ ] Realtime dashboard (WebSocket/SSE)
- [ ] Forecast vynosu z pipeline
- [ ] A/B testovani skriptu
- [ ] Kohortova analyza

### 6.4 PWA a mobile
- [ ] PWA manifest pro instalaci
- [ ] Offline cache kontaktu
- [ ] Swipe akce na kontaktech
- [ ] Push notifikace (service worker)

---

## PREHLED FAZI

| Faze | Nazev | Polozek | Priorita |
|------|-------|---------|----------|
| 1 | Profil kontaktu a UX | 15 | VYSOKA |
| 2 | Kampane a pokrocile volani | 13 | VYSOKA |
| 3 | Reporty a management | 12 | STREDNI |
| 4 | Kvalita dat a compliance | 14 | STREDNI |
| 5 | Integrace a dokumenty | 14 | NIZSI |
| 6 | AI a automatizace | 13 | BUDOUCI |
| **Celkem** | | **81** | |

---

## TECHNICKE POZNAMKY

- **Databaze:** Pro 10 000+ kontaktu zvazit PostgreSQL (Supabase/Neon) misto SQLite/Turso
- **Indexy:** Pridat na agent_id, project_id, pipeline_stage, database_id, date sloupce
- **Realtime:** Pro Fazi 6 bude potreba WebSocket/SSE (Vercel streaming nebo externi)
- **Search:** Pro globalni vyhledavani pouzit FTS5 extension na SQLite nebo Meilisearch
- **Storage:** Pro file upload Cloudflare R2 (nejlevnejsi) nebo Supabase Storage
