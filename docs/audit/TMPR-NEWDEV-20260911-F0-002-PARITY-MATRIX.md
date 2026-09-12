# PARITNÍ A MIGRAČNÍ MATICE — DEV3 → NOVÝ ZAČÁTEK

**AUDIT / ARTIFACT ID:** TMPR-NEWDEV-20260911-F0-002-PARITY-MATRIX  
**TASK ID:** TMPR-NEWDEV-20260911-F0-002 (Revidováno v TMPR-NEWDEV-20260911-F0-002-R01)  
**DATUM:** 2026-09-11  
**PROJEKT:** Táta má právo / Synthesis  
**FÁZE:** F0 — Inventář  
**REŽIM:** ANALYSIS + DOCUMENTATION ONLY  
**STAV:** ✅ **PASS — OPRAVENO (R01)**  
**REFERENČNÍ REPOZITÁŘ:** [https://github.com/jirisar7-eng/dev3](https://github.com/jirisar7-eng/dev3)  
**REFERENČNÍ COMMIT DEV3:** `696df6255dfe1e0f1ac21a02b002999b557629e4`  
**DESIGN AUTHORITY:** `TMPR-BRAND-BLUE-1.0`  

---

## 1. MANIFEST A ROZHODOVACÍ PRINCIP
Tento dokument představuje autoritativní rozhodovací mapu pro přechod z historického prototypu DEV3 do nového modulárního ekosystému.

> **Základní pravidlo:**  
> **„Zachovat hodnotu a schopnosti. Nepřenášet starou konstrukci.“**  
> *Kdybychom dnes DEV3 zahodili, co z jeho hodnoty musíme zachránit — a co už do nového systému vůbec nechceme?*

### Přísné architektonické zákazy (CO NIKDY NEPŘENÁŠÍME):
- ❌ **server.ts** (5 584 řádků monolitu míchajícího routy, DB přístup, static serving a procesy)
- ❌ **dbStore.ts** (177 KB in-memory/JSON fallback způsobující rozpad konzistence a obcházení bezpečnosti)
- ❌ **Monolitické routery a 35-záložkový dashboard**
- ❌ **Hardcoded obsah, šablony a FAQ** přímo v kódu stránek
- ❌ **Hardcoded neschválený design, nepovolené fonty** (`Playfair Display`, `Plus Jakarta Sans`) a barevné gradienty
- ❌ **Přímé spouštění příkazů na VPS/Dockeru/GitHubu** z webového UI administrace
- ❌ **Automatické slepé kopírování všech 139 Prisma modelů a ~488 API endpointů**

---

## 2. STATISTICKÝ SOUHRN MATICE (PO REVIZI R01)

| Klasifikace | Počet schopností | Popis kategorie |
| :--- | :---: | :--- |
| **PŘEVZÍT** *(KEEP)* | **8** | Čistá data, algoritmy, matematická a procesní pravidla použitelná téměř přímo |
| **PŘEVÉST NA DATA** *(CONVERT TO DATA)* | **6** | Texty, šablony podání, průvodci, wiki a kvízy patřící do Synthesis CMS |
| **PŘEPSAT** *(REBUILD)* | **22** | Klíčové funkční schopnosti implementované čistě v modulární Next.js / NestJS architektuře |
| **SLOUČIT** *(MERGE)* | **4** | Roztříštěné entity a logy sjednocené do jednoho kanonického modelu |
| **ODLOŽIT** *(DEFER)* | **4** | Hodnotné, ale neesenciální funkce odložené na navazující fáze |
| **VYŘADIT** *(REMOVE)* | **8** | Monolitický balast, mrtvý kód, nebezpečné provizorní skripty a obcházky |
| **NEURČENO** *(UNDECIDED)* | **1** | Otázka integrace správy DNS/mailu na úrovni aplikace vs. čistého DevOps |
| **CELKEM** | **53** | **100 % zmapovaných schopností DEV3** |

### Ochranné brány citlivých dat (SENSITIVE GATES):
- **16 schopností** obsahuje osobní, klientská, procesní či autentizační data a je u nich vyžadována:  
  `SEPARATE_SECURITY_LEGAL_MIGRATION_GATE_REQUIRED`  
  *(Žádná z těchto dat se v této fázi automaticky nemigrují).*

---

## 3. PROVĚŘENÍ VYSOKOHODNOTNÝCH AKTIV Z F0-001-R02

Následující klíčová aktiva byla identifikována ve F0-001-R02 a je u nich stanovena striktní forma ochrany:

| Aktivum / Schopnost | Typ aktiva | Zdroj v DEV3 | Klasifikace | Cílová vrstva / moduleKey |
| :--- | :--- | :--- | :--- | :--- |
| **OSPOD data ČR** | **DATA** | `src/data/ospodDataset.json` | **PŘEVZÍT** | Project Package Táta má právo (`institutions.registry`) |
| **Soudy ČR** | **DATA** | `src/data/soudyDataset.ts` | **PŘEVZÍT** | Project Package Táta má právo (`institutions.registry`) |
| **Advokáti ČAK** | **DATA** | `src/data/cakAdvokatiDataset.ts` | **PŘEVZÍT** | Project Package Táta má právo (`institutions.registry`) |
| **Legal Pack 2.0 vzory** | **CONTENT** | `src/data/legalDrafts20.ts` (187 KB) | **PŘEVÉST NA DATA** | Synthesis CMS (`legal.templates`) |
| **Wiki a slovník pojmů** | **CONTENT** | `src/data/wikiSeed.ts` | **PŘEVÉST NA DATA** | Synthesis CMS (`education.wiki`) |
| **Memento otců** | **CONTENT** | `src/data/mementoSeed.ts` | **PŘEVÉST NA DATA** | Project Package Táta má právo (`community.memento`) |
| **Kalkulačka výživného** | **ALGORITHM** | `src/components/public/AlimonyCalculatorView.tsx` | **PŘEVZÍT** | Domain Module (`family.alimony`) |
| **Care Occurrence Engine** | **ALGORITHM** | `src/services/care/careOccurrenceEngine.ts` | **PŘEVZÍT** | Domain Module (`family.child-care`) |
| **e-Sbírka Quota Guard** | **ALGORITHM** | `src/services/esbirka/EsbirkaQuotaGuard.ts` | **PŘEVZÍT** | Worker (`legal.statutes-sync`) |
| **Parser rozsudků** | **ALGORITHM** | `src/services/deterministicJudgmentParser.ts` | **PŘEVZÍT** | Domain Module (`legal.judgment-parser`) |
| **Bezpečnostní testy** | **TEST** | `tests/security/*`, `tests/idor.test.ts` | **PŘEVZÍT** | Synthesis OS (`testing.security`) |
| **Právní průvodci** | **CONTENT** | `src/data/legalGuidesSeed.ts` | **PŘEVÉST NA DATA** | Synthesis CMS (`legal.guides`) |
| **Modulární systém** | **MODULE CAPABILITY** | `src/core/moduleEngine.ts` | **PŘEPSAT** | Synthesis OS (`platform.module-engine`) |

---

## 4. KOMPLETNÍ MATICE SCHOPNOSTÍ DLE KATEGORIÍ

### 4.1 PŘEVZÍT (KEEP — 8 schopností)
Čistá hodnota, která se zkopíruje jako čistá knihovna, data nebo ověřený algoritmus.

1. **CAP-DATA-001: Registr a adresář OSPOD v ČR**  
   - *Zdroj:* `src/data/ospodDataset.json`, Prisma `Subjekt`, `Pracovnik`  
   - *Důvod:* Kompletní ověřená databáze všech pracovišť OSPOD v ČR včetně kontaktů a geokódů.  
   - *Cíl:* Project Package Táta má právo (`institutions.registry`) | Priorita: **P0** | Brána: `STATIC_DATA_IMPORT_GATE`

2. **CAP-DATA-002: Registr a metadata soudů ČR**  
   - *Zdroj:* `src/data/soudyDataset.ts`, `src/data/soudyVerifiedMetadata.ts`  
   - *Důvod:* Ověřená strukturovaná sada okresních, krajských a vrchních soudů včetně datových schránek.  
   - *Cíl:* Project Package Táta má právo (`institutions.registry`) | Priorita: **P0** | Brána: `STATIC_DATA_IMPORT_GATE`

3. **CAP-DATA-003: Adresář advokátů ČAK pro rodinné právo**  
   - *Zdroj:* `src/data/cakAdvokatiDataset.ts`  
   - *Důvod:* Prověřená datová sada advokátů se zaměřením na rodinné právo.  
   - *Cíl:* Project Package Táta má právo (`institutions.registry`) | Priorita: **P1** | Brána: `STATIC_DATA_IMPORT_GATE`

4. **CAP-ENG-001: Výpočetní engine výživného (Alimony Calculator)**  
   - *Zdroj:* `src/components/public/AlimonyCalculatorView.tsx`, `tests/alimonyCalculator.test.ts`  
   - *Důvod:* Matematická logika výpočtu dle doporučujících tabulek MS ČR (věk, příjmy, kontrolní částky).  
   - *Cíl:* Domain Module (`family.alimony`) | Priorita: **P0** | Brána: `NONE`

5. **CAP-ENG-002: Care Occurrence & Age Engine (plánování péče)**  
   - *Zdroj:* `src/services/care/careOccurrenceEngine.ts`, `ageEngine.ts`, `careMetricsEngine.ts`  
   - *Důvod:* Algoritmus generování střídání péče (sudé/liché týdny, svátky, prázdniny) a milníků věku dítěte.  
   - *Cíl:* Domain Module (`family.child-care`) | Priorita: **P0** | Brána: `NONE`

6. **CAP-ENG-003: Deterministický parser výroků rozsudků**  
   - *Zdroj:* `src/services/deterministicJudgmentParser.ts`, `judgmentParserService.ts`  
   - *Důvod:* Pravidly řízená extrakce výše výživného, frekvence styku a dnů předávání bez LLM halucinací.  
   - *Cíl:* Domain Module (`legal.judgment-parser`) | Priorita: **P1** | Brána: `NONE`

7. **CAP-ENG-004: e-Sbírka Quota Guard & Lock Guard**  
   - *Zdroj:* `src/services/esbirka/EsbirkaQuotaGuard.ts`, `EsbirkaLockGuard.ts`, `EsbirkaNormalizer.ts`  
   - *Důvod:* Striktní ochrana limitů e-Sbírky (1 req/s, max 5 req/den, zámky souběhu).  
   - *Cíl:* Worker (`legal.statutes-sync`) | Priorita: **P0** | Brána: `NONE`

8. **CAP-ENG-006: BIFF komunikační validátor**  
   - *Zdroj:* `src/components/public/BiffCommunicationView.tsx`  
   - *Důvod:* Algoritmická kontrola zpráv (Brief, Informative, Friendly, Firm).  
   - *Cíl:* Domain Module (`support.communication`) | Priorita: **P1** | Brána: `NONE`

---

### 4.2 PŘEVÉST NA DATA (CONVERT TO DATA — 6 schopností)
Statický obsah zakódovaný v TypeScript souborech, který musí být importován do Synthesis CMS databáze.

1. **CAP-DATA-004: Vzory právních podání (Legal Pack 2.0)**  
   - *Zdroj:* `src/data/legalDrafts20.ts`, `legalDocuments.ts`, `legalTemplates.ts`  
   - *Cíl:* Synthesis CMS (`legal.templates`) | Priorita: **P0** | Brána: `CONTENT_IMPORT_GATE`

2. **CAP-DATA-005: Právní průvodci a návody (Legal Guides)**  
   - *Zdroj:* `src/data/legalGuidesSeed.ts`, `src/components/public/legal/*`  
   - *Cíl:* Synthesis CMS (`legal.guides`) | Priorita: **P0** | Brána: `CONTENT_IMPORT_GATE`

3. **CAP-DATA-006: Slovník a wiki rodinného práva**  
   - *Zdroj:* `src/data/wikiSeed.ts`, Prisma `WikiTerm`  
   - *Cíl:* Synthesis CMS (`education.wiki`) | Priorita: **P1** | Brána: `CONTENT_IMPORT_GATE`

4. **CAP-DATA-007: Memento otců (databáze a kauzy)**  
   - *Zdroj:* `src/data/mementoSeed.ts`, Prisma `MementoCase`  
   - *Cíl:* Project Package Táta má právo (`community.memento`) | Priorita: **P1** | Brána: `CONTENT_IMPORT_GATE`

5. **CAP-DATA-008: Akademie, kvízy a videolekce**  
   - *Zdroj:* `src/data/quizzesSeed.ts`, `videosSeed.ts`, Prisma `Quiz`, `AcademyVideo`  
   - *Cíl:* Synthesis CMS (`education.academy`) | Priorita: **P2** | Brána: `CONTENT_IMPORT_GATE`

6. **CAP-DATA-009: Statické články, FAQ a novinky**  
   - *Zdroj:* `prisma/seed-articles.ts`, `prisma/seed-help-news.ts`, `FaqSection.tsx`  
   - *Cíl:* Synthesis CMS (`cms.articles`) | Priorita: **P1** | Brána: `CONTENT_IMPORT_GATE`

---

### 4.3 PŘEPSAT (REBUILD — 22 schopností)
Základní aplikační rozhraní a platformní služby, které budou vybudovány nově, modulárně a čistě v moderním stacku.

1. **CAP-ENG-005: e-Sbírka synchronizační klient** (Worker `legal.statutes-sync`, P1)
2. **CAP-ENG-007: Offline šifrovaný vault WebCrypto** (Můj případ `case.offline-vault`, P0, **SENSITIVE**)
3. **CAP-UI-001: Veřejný portál Táta má právo** (Project Package `portal.public`, P0, Blue Brand 1.0)
4. **CAP-UI-002: Registr a mapa subjektů UI** (Project Package `institutions.registry-ui`, P1)
5. **CAP-UI-003: Krizový portál SOS 48 hodin** (Project Package `support.crisis`, P0)
6. **CAP-UI-004: Můj případ — Přehled spisu, děti** (Můj případ `case.core`, P0, **SENSITIVE**)
7. **CAP-UI-005: Můj případ — Kalendář péče UI** (Můj případ `family.child-care-ui`, P0, **SENSITIVE**)
8. **CAP-UI-006: Můj případ — Trezor dokumentů a důkazů** (Můj případ `case.documents`, P0, **SENSITIVE**)
9. **CAP-UI-007: Můj případ — Soudní řízení a procesní lhůty** (Můj případ `case.proceedings`, P0, **SENSITIVE**)
10. **CAP-UI-008: Můj případ — Deník rodiče a časová osa** (Můj případ `case.timeline`, P1, **SENSITIVE**)
11. **CAP-UI-009: CoParentHub — Párování a režimy konfliktu** (CoParentHub `coparent.core`, P0, **SENSITIVE**)
12. **CAP-UI-010: CoParentHub — Předávání dětí a výdaje** (CoParentHub `coparent.handovers-expenses`, P0, **SENSITIVE**)
13. **CAP-UI-011: CoParentHub — Tisk auditního protokolu** (CoParentHub `coparent.audit-export`, P1, **SENSITIVE**)
14. **CAP-UI-012: Uživatelský profil a autentizace (Passkeys, 2FA)** (Synthesis OS `auth.core`, P0, **SENSITIVE**)
15. **CAP-ADM-001: Synthesis Administrace — Modulární Dashboard** (Synthesis Administrace `admin.dashboard`, P0)
16. **CAP-ADM-002: Synthesis RBAC & Správa uživatelů** (Synthesis OS `auth.rbac`, P0, **SENSITIVE**)
17. **CAP-ADM-003: Správa a moderace subjektů** (Synthesis Administrace `institutions.moderation`, P1)
18. **CAP-ADM-004: Synthesis Brand Studio** (Synthesis CMS `branding.studio`, P2)
19. **CAP-ADM-005: Synthesis Text Registry / CMS Engine** (Synthesis CMS `cms.text-registry`, P0)
20. **CAP-ADM-006: Team Center — Dobrovolníci a tikety** (Team Center `team.workspace`, P1, **SENSITIVE**)
21. **CAP-ADM-007: Synthesis Control Plane — Operace a tiketing** (Synthesis OS `platform.control-plane`, P2)
22. **CAP-DEF-005: Znovuvybudovaný Modulární systém (Module Engine)** (Synthesis OS `platform.module-engine`, P0)  
   - *Původ:* `src/core/moduleEngine.ts`, `src/components/admin/CustomModuleManager.tsx`  
   - *Rozsah F1:* Module Contract, manifest, Module Registry, dependency resolver, detekce cyklů, lifecycle (install/enable/disable/uninstall), route/API module gates, povinné/volitelné závislosti, fallback při vypnutí modulu, boundary / forbidden-import testy.  
   - *Klíčový význam:* **Bez této vrstvy se nesmí začít stavět doménové funkce.**

---

### 4.4 SLOUČIT (MERGE — 4 schopnosti)
Roztříštěné datové a procesní modely sjednocené do jediné kanonické formy:

1. **CAP-MRG-001: Auditní logování napříč doménami**  
   - *Původ:* `AuditLog`, `LegalAuditLog`, `CoParentAuditLog`, `SensitiveAccessLog`, `LegalSyncAudit`  
   - *Sloučeno do:* Jednotný neměnný append-only ledger `audit.ledger` v Synthesis OS.  
   - *Brána:* `SEPARATE_SECURITY_LEGAL_MIGRATION_GATE_REQUIRED` | Priorita: **P0**

2. **CAP-MRG-002: Klientský spis (sloučení UserCase a Case)**  
   - *Původ:* Dvojí modely `UserCase` vs `Case`, `UserChild` vs `Child`, `UserDocument` vs `CaseDocument`  
   - *Sloučeno do:* Jediné kanonické hierarchie `Case` v modulu Můj případ.  
   - *Brána:* `SEPARATE_SECURITY_LEGAL_MIGRATION_GATE_REQUIRED` | Priorita: **P0**

3. **CAP-MRG-003: Evidence institucí a ověřených profilů**  
   - *Původ:* `Subjekt`, `SubjectVerifiedProfile`, `SubjectInformationSource`  
   - *Sloučeno do:* Integrovaného modelu instituce v `institutions.registry`.  
   - *Brána:* `STATIC_DATA_IMPORT_GATE` | Priorita: **P1**

4. **CAP-MRG-004: Koncepty formulářů a návrhů podání**  
   - *Původ:* `CaseSubmissionDraft` a `FormSubmission`  
   - *Sloučeno do:* Jednotného systému konceptů podání `case.drafts`.  
   - *Brána:* `SEPARATE_SECURITY_LEGAL_MIGRATION_GATE_REQUIRED` | Priorita: **P1**

---

### 4.5 ODLOŽIT (DEFER — 4 schopnosti)
Hodnotné, ale neesenciální schopnosti pro první základ (prověřeno — žádná z nich není nutnou závislostí pro F1/F2):

1. **CAP-DEF-001: Multi-AI Consensus Orchestrátor (Grok, Groq, Gemini)** (Synthesis OS `ai.consensus`, P3) — konsenzuální hlasování více LLM.
2. **CAP-DEF-002: Orion Visual Trace Center & Mind Map** (Synthesis Administrace `orion.telemetry`, P3) — telemetrické myšlenkové mapy Oriona.
3. **CAP-DEF-003: Puck blokový vizuální CMS editor** (Synthesis CMS `cms.page-builder`, P2) — vizuální drag&drop CMS editor; základní texty poběží přes Text Registry / Page Engine.
4. **CAP-DEF-004: Veřejné komunitní diskuzní fórum** (Project Package `community.forum`, P3, **SENSITIVE**) — vyžaduje nepřetržitou moderaci a právní záruky.

---

### 4.6 VYŘADIT (DO NOT CARRY OVER — 8 položek)
Technický balast, nebezpečné konstrukce a mrtvý kód, které se do nového systému **nesmí dostat**:

1. ❌ **CAP-REM-001: Monolitický server.ts (5 584 řádků)**
2. ❌ **CAP-REM-002: Fallback dbStore.ts (177 KB in-memory/JSON store)**
3. ❌ **CAP-REM-003: Přímé ovládání VPS z webového UI (/api/admin/vps)**
4. ❌ **CAP-REM-004: Ad-hoc kořenové skripty a patche (fix_brace.cjs, patch_ui.cjs atd.)**
5. ❌ **CAP-REM-005: Jednoúčelové ad-hoc testovací skripty v kořeni (test-jwt.js atd.)**
6. ❌ **CAP-REM-006: Custom history state router v App.tsx**
7. ❌ **CAP-REM-007: Neschválené AI fonty a barevné gradienty (Playfair, Plus Jakarta)**
8. ❌ **CAP-REM-008: Experimentální neověřené pohledy (src/components/experimental/*)**

---

### 4.7 NEURČENO (UNDECIDED — 1 schopnost)
1. **CAP-UND-001: Mailcow & Vercel DNS automatizace**  
   - *Otázka:* Patří správa poštovních schránek a DNS do klientské webové administrace, nebo má zůstat striktně v infrastruktuře (Ansible/Terraform/DevOps)?  
   - *Doporučení:* Vyjmout z aplikace do DevOps nástrojů.

---

## 5. ZÁVĚREČNÉ KATEGORICKÉ SEZNAMY

### 🌟 MUST KEEP (Okamžitá záchrana logiky a dat)
- Databáze OSPOD ČR (`CAP-DATA-001`)
- Metadata soudů ČR (`CAP-DATA-002`)
- Databáze advokátů ČAK (`CAP-DATA-003`)
- Výpočetní algoritmus výživného (`CAP-ENG-001`)
- Care Occurrence & Age Engine (`CAP-ENG-002`)
- Deterministický parser rozsudků (`CAP-ENG-003`)
- e-Sbírka Quota Guard & Lock Guard (`CAP-ENG-004`)
- BIFF heuristický validátor (`CAP-ENG-006`)

### 🏗️ REBUILD CLEAN (Čistá modulární reimplementace)
- **Modulární systém Nového začátku (Synthesis OS Module Engine)** (`CAP-DEF-005`, P0) — základ pro všechny doménové moduly
- Veřejný portál Táta má právo (Next.js App Router dle `TMPR-BRAND-BLUE-1.0`)
- Krizový portál SOS 48 hodin
- Můj případ (jádro spisu, kalendář péče, trezor dokumentů s MinIO S3, řízení a lhůty)
- CoParentHub (režimy konfliktu, potvrzování předání dětí, sdílené výdaje, protokol pro soud)
- Synthesis Administrace (modulární Next.js rozhraní)
- Synthesis OS Auth & RBAC (Passkeys, TOTP, Policy Engine)
- Team Center (koordinace dobrovolníků)
- Offline Vault (WebCrypto AES-GCM)

### 📦 CONTENT/DATA TO IMPORT (Export do Synthesis CMS)
- Legal Pack 2.0 vzory právních podání (187 KB)
- Právní průvodci a manuály
- Slovník a wiki rodinného práva
- Memento otců databáze kauz
- Akademie, kvízy a videolekce
- Statické články a FAQ

### 🛑 DO NOT CARRY OVER (Striktní zákaz přenosu)
- `server.ts` monolit
- `dbStore.ts` in-memory store
- Přímé spouštění příkazů na VPS z administrace
- Ad-hoc skripty a patche v kořeni repozitáře
- Custom history pushState router
- Neschválené fonty a gradienty

### ⏳ DEFER (Odloženo na navazující fáze)
- Multi-AI Consensus Orchestrátor
- Orion Visual Trace Center
- Puck vizuální CMS editor
- Veřejné komunitní diskuzní fórum

---

## 6. STAV KÓDU A KONTROLA INTEGRITY
- **Aplikační UI kód:** ZCELA NEDOTČEN (0 řádků změny)
- **Databáze:** NEDOTČENA (žádná migrace nebyla spuštěna)
- **Brand Authority:** ZACHOVÁNA (`TMPR-BRAND-BLUE-1.0`)
- **Strukturovaná data:** Uložena v `docs/audit/data/TMPR-NEWDEV-20260911-F0-002-parity.json`
