# HRANICE WORKSPACE A BALÍČKŮ — NOVÝ ZAČÁTEK (SYNTHESIS & TÁTA MÁ PRÁVO)

**DOKUMENT / SPECIFIKACE ID:** TMPR-NEWDEV-WORKSPACE-BOUNDARIES-1.0
**TASK ID:** TMPR-NEWDEV-20260911-F1-001 (Revidováno v TMPR-NEWDEV-20260911-F1-001-R01)
**DATUM:** 2026-09-11
**FÁZE:** F1 — Kontrakty
**PRIORITA:** P0
**REŽIM:** ARCHITECTURE DESIGN ONLY
**STAV:** ✅ **SCHVÁLENÁ ARCHITEKTONICKÁ SPECIFIKACE (PO REVIZI R01)**
**DESIGN AUTHORITY PROJEKTU:** `TMPR-BRAND-BLUE-1.0` (Pouze pro projectKey=tata-ma-pravo)
**REFERENČNÍ VÝCHOZÍ BOD:** `TMPR-NEWDEV-20260911-F0-002-R01` (Paritní matice)

---

## 1. MANIFEST A ROZHODOVACÍ PRINCIPY

Tento dokument definuje závazné hranice monorepa, odpovědnosti aplikací, balíčků a modulů, povolené i zakázané směry závislostí a mechanismy jejich automatické vynutitelnosti v CI.

### Základní architektonické axiomy:
1. **Autoritativní hierarchie vrstev (od obecného k specifickému):**
   `Synthesis OS (Platform Core & Platform Services včetně Module Engine)`
   `→ Synthesis CMS`
   `→ Project Package (tata-ma-pravo)`
   `→ Domain Modules (rodinné právo, krizová pomoc, péče, spis)`
   **Závislosti smějí směřovat POUZE k nižší, obecnější vrstvě.**
2. **Synthesis OS je nezávislá a brandově neutrální platforma:**
   Synthesis OS (včetně Module Engine, UI Core a Administrace) je zcela neutrální. Nesmějí v něm existovat žádné reference, importy ani vazby na projekt „Táta má právo“, rodinněprávní doménu ani specifický projektový brand.
3. **Synthesis CMS je doménově agnostický obsahový engine:**
   Spravuje texty, šablony a články, ale neobsahuje žádnou rodinněprávní ani klientskou byznys logiku.
4. **Vlastnictví brandu (Brand Ownership):**
   Vizuální identita `TMPR-BRAND-BLUE-1.0` a logo `brand.tata-ma-pravo.logo.source` patří **VÝHRADNĚ** projektu `projectKey=tata-ma-pravo`. Brand Pack je integrován přímo do `packages/project-tata-ma-pravo/brand` a nesmí být globálním balíčkem Synthesis platformy. Synthesis Admin, Control Plane a CMS mají vlastní neutrální App Identity.
5. **Decentralizované vlastnictví databáze (Modular Database Ownership):**
   Každý doménový modul je výhradním vlastníkem svého Prisma schématu, svých migrací a svých dat. Centrální vrstva `packages/db` pouze skládá (komponuje) Prisma schéma/klienta a orchestrueje spouštění migrací.
6. **Modulární zapouzdření (Module Encapsulation):**
   Modul NESMÍ importovat interní soubory jiného modulu. Komunikace probíhá výhradně přes deklarované veřejné rozhraní (`contract`).
7. **Nulové kruhové závislosti (Zero Circular Dependencies):**
   Ani mezi balíčky, ani mezi moduly, ani v rámci aplikací nesmí vzniknout cyklus.
8. **Infrastruktura asynchronních úloh (Queue Architecture):**
   Architektonický základ nepoužívá Redis ani BullMQ. Asynchronní fronta úloh v první verzi běží jako **PostgreSQL-backed queue** (např. `pg-boss` / transakční fronta nad PostgreSQL) integrovaná v `apps/worker`. Zavedení Redisu je možné výhradně na základě budoucího samostatného Architecture Decision.
9. **Zákaz znovuzrození monolitu a paměťových fallbacků:**
   Žádný monolitický `server.ts` (5 500+ řádků) ani in-memory `dbStore.ts`. API je čistě modulární NestJS aplikace s transakčním přístupem do PostgreSQL.

---

## 2. TECHNOLOGICKÝ STACK A MONOREPO NÁSTROJE

| Vrstva / Nástroj | Verze / Standard | Role v architektuře |
| :--- | :--- | :--- |
| **Node.js** | **24 LTS** | Běhové prostředí s nativní podporou TypeScriptu a moderních standardů |
| **Správce balíčků** | **pnpm (v9+)** | Workspace správa, striktní izolace závislostí, symlink izolace proti phantom deps |
| **Monorepo Build** | **Turborepo** | Paralelní build pipeline, inkrementální cache, vizualizace dependency graphu |
| **Jazyk** | **TypeScript 5.x** | Striktní typování (`strict: true`), Project References pro rychlý typecheck |
| **Frontend Framework** | **Next.js 15+ (App Router)** | Server Components, SSR/SSG, optimalizace aktiv, PWA podpora |
| **Backend Framework** | **NestJS 11+** | Modulární DI kontejner, standardizované filtry, guardy, pipes, mikro-služby |
| **Databáze & ORM** | **PostgreSQL 16+ & Prisma 6+** | Modulární relační schémata, striktní migrace, auditovatelnost |
| **Asynchronní fronta** | **PostgreSQL-backed queue (pg-boss)** | Řízení asynchronních úloh bez nutnosti Redis serveru |
| **Projektový Brand** | **TMPR-BRAND-BLUE-1.0** | Autoritativní styl pro projekt Táta má právo (vázán na `packages/project-tata-ma-pravo`) |
| **Systémový UI styl** | **Synthesis Neutral UI** | Neutrální systémové tokeny pro Synthesis Admin a CMS (WCAG AA) |

---

## 3. PŘESNÝ STROM WORKSPACE

```text
tmpr-monorepo/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, typecheck, tests, boundary-check
│       └── release.yml               # Build a deployment pipeline
├── .dependency-cruiser.js            # Pravidla pro Dependency Cruiser (zakázané importy)
├── .editorconfig
├── .eslintrc.cjs                     # ESLint s eslint-plugin-boundaries
├── .gitignore
├── .npmrc                            # pnpm nastavení (shamefully-hoist=false)
├── package.json                      # Kořenový manifest (scripts: build, lint, test)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml               # Deklarace apps/*, packages/*, modules/*
├── README.md
├── tsconfig.base.json                # Sdílená základní TS konfigurace
├── tsconfig.json                     # Root project references
├── turbo.json                        # Turborepo pipeline (build, test, lint, dev)
│
├── apps/                             # 6 dedikovaných aplikací
│   ├── admin/                        # Synthesis Administrace (Next.js App Router — BRANDOVĚ NEUTRÁLNÍ)
│   │   ├── app/                      # Control Plane, RBAC, Module Manager, Text Registry
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api/                          # Centrální modulární backend (NestJS)
│   │   ├── src/                      # Modulární kontejner SYNAPI, Policy Engine, Auth
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── case/                         # Klientský portál Můj případ & CoParentHub (Next.js)
│   │   ├── app/                      # Spis, děti, kalendář, trezor, WebCrypto offline vault
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── public/                       # Veřejný portál Táta má právo (Next.js App Router — TMPR-BRAND-BLUE-1.0)
│   │   ├── app/                      # SOS 48h, kalkulačka výživného, registr OSPOD/soudů
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── team/                         # Team Center pro dobrovolníky spolku (Next.js)
│   │   ├── app/                      # Krizové tikety, koordinace podpory, RBAC dobrovolník
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── worker/                       # Asynchronní background worker (NestJS / PostgreSQL-backed queue)
│       ├── src/                      # e-Sbírka synchronizace, PDF reporty, plánované úlohy
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                         # Platformní, infrastrukturní a projektové balíčky
│   │
│   ├── synthesis-core/               # [Synthesis OS / Platform Core]
│   │   ├── src/
│   │   │   ├── audit/                # Jednotný neměnný Audit Ledger rozhraní
│   │   │   ├── auth/                 # RBAC typy, Session abstrakce, Passkey rozhraní
│   │   │   ├── policy/               # Policy Engine (Default Deny) abstrakce
│   │   │   └── result/               # Result/Error monády a standardizované chyby
│   │   ├── package.json              # @tmpr/synthesis-core
│   │   └── tsconfig.json
│   │
│   ├── module-engine/                # [Synthesis OS / Platform Services] JÁDRO MODULÁRNÍHO SYSTÉMU (P0 ZÁKLAD)
│   │   ├── src/
│   │   │   ├── contract/             # IModule, IModuleManifest, IModuleLifecycle
│   │   │   ├── registry/             # ModuleRegistry, ModuleDiscovery
│   │   │   ├── resolver/             # DependencyResolver, detekce cyklů
│   │   │   ├── gates/                # Next.js Route Gates, NestJS API Guards
│   │   │   └── fallback/             # Fail-closed graceful degradation komponenty
│   │   ├── package.json              # @tmpr/module-engine
│   │   └── tsconfig.json
│   │
│   ├── ui/                           # [Synthesis OS / Platform Services] Brandově neutrální design systém
│   │   ├── src/                      # Neutrální komponenty (Button, Input, Modal, Card, Table)
│   │   ├── package.json              # @tmpr/ui (čistě neutrální tokeny, bez vazby na Blue Brand)
│   │   └── tsconfig.json
│   │
│   ├── synthesis-cms/                # [Synthesis CMS] Obsahový engine (doménově nezávislý)
│   │   ├── src/
│   │   │   ├── text-registry/        # Správa textových řetězců a revizí
│   │   │   ├── templates/            # Šablonovací engine podání a dokumentů
│   │   │   └── articles/             # Články, průvodci a kategorizace
│   │   ├── package.json              # @tmpr/synthesis-cms
│   │   └── tsconfig.json
│   │
│   ├── project-tata-ma-pravo/        # [Project Package] TÁTA MÁ PRÁVO (Vlastník projektu a brandu)
│   │   ├── brand/                    # VÝHRADNÍ VLASTNICTVÍ BRANDU: TMPR-BRAND-BLUE-1.0
│   │   │   ├── tokens.json           # Barevné tokeny, font-stacky, rádiusy
│   │   │   ├── tailwind-preset.js    # Tailwind preset pro aplikace projektu
│   │   │   └── assets/               # brand.tata-ma-pravo.logo.source a odvozené ikony
│   │   ├── src/
│   │   │   ├── manifest.ts           # Deklarace projektu v Synthesis (projectKey: tata-ma-pravo)
│   │   │   ├── modules.ts            # Seznam aktivovaných doménových modulů
│   │   │   └── branding.ts           # Export projektového tématu a loga
│   │   ├── package.json              # @tmpr/project-tata-ma-pravo (exportuje i @tmpr/project-tata-ma-pravo/brand)
│   │   └── tsconfig.json
│   │
│   ├── contracts/                    # Sdílená DTO, Zod schémata a API rozhraní
│   │   ├── src/                      # Request/response typy, error kódy, společné modely
│   │   ├── package.json              # @tmpr/contracts
│   │   └── tsconfig.json
│   │
│   └── db/                           # [Centrální kompozitní DB vrstva]
│       ├── src/                      # Kompozitní Prisma Client wrapper, orchestrátor migrací
│       ├── package.json              # @tmpr/db (POUZE PRO apps/api a apps/worker!)
│       └── tsconfig.json
│
├── modules/                          # DOMÉNOVÉ MODULY (implementují ModuleContract & vlastní svá data)
│   ├── case-core/                    # Klientský spis, evidence dětí, procesní lhůty
│   ├── community-memento/            # Databáze kauz a uctění památky Memento otců
│   ├── coparent-hub/                 # Režimy konfliktu, předávání dětí, sdílené výdaje
│   ├── family-alimony/               # Výpočetní engine výživného (Alimony Calculator)
│   ├── family-child-care/            # Care Occurrence & Age Engine, kalendář péče
│   ├── institutions-registry/        # Registr a metadata OSPOD, soudů a advokátů ČAK
│   ├── legal-judgment-parser/        # Deterministický parser výroků rozsudků
│   ├── legal-statutes-sync/          # e-Sbírka Quota Guard, Lock Guard a synchronizace
│   └── support-communication/        # BIFF heuristický validátor komunikace
│
├── tools/                            # Vývojářské a auditní nástroje
│   ├── ci/
│   │   ├── check-boundaries.ts       # Validátor zakázaných importů a architektonických hranic
│   │   ├── compose-prisma-schema.ts  # Nástroj pro kompozici Prisma schémat z modulů do packages/db
│   │   └── check-brand-compliance.ts # Kontrola izolace brandu (zákaz Blue Brandu v Synthesis OS)
│   └── scripts/                      # Pomocné build skripty
│
└── docs/                             # Architektura, audity a standardy
    ├── architecture/
    │   └── TMPR-NEWDEV-WORKSPACE-BOUNDARIES-1.0.md
    ├── audit/
    └── brand/
```

---

## 4. ODPOVĚDNOSTI A HRANICE JEDNOTLIVÝCH JEDNOTEK

### 4.1 Aplikace (`apps/*`)

Každá aplikace představuje samostatně nasaditelný kontejner s přesně vymezeným účelem:

1. **`apps/public` (Veřejný krizový a informační portál)**
   - **Odpovědnost:** Poskytování veřejných informací, krizová pomoc SOS 48h, interaktivní kalkulačka výživného, veřejný adresář OSPOD a soudů, edukační průvodci a wiki.
   - **Vizuální identita:** Plná aplikace `TMPR-BRAND-BLUE-1.0` a loga `brand.tata-ma-pravo.logo.source`.
   - **Bezpečnostní hranice:** Zcela anonymní přístup + volitelné klientské lokální uložení. **NEMÁ ŽÁDNÝ PŘÍSTUP** k neveřejným klientským spisům, administraci ani interním datům.
   - **Technologie:** Next.js App Router, PWA schopnosti pro offline zobrazení krizových manuálů, SSR.

2. **`apps/case` (Klientský portál „Můj případ“ & „CoParentHub“)**
   - **Odpovědnost:** Osobní zóna rodiče pro vedení spisu, správu dětí, plánování péče, evidenci výdajů a předávání, šifrovaný trezor dokumentů a generování auditního protokolu pro soud.
   - **Vizuální identita:** Odvozená projektová identita Táta má právo.
   - **Bezpečnostní hranice:** Striktní autentizace (Zero Trust, Passkeys/2FA), přísná izolace spisů (Case Isolation — klientský uživatel vidí POUZE svůj spis), klientské šifrování WebCrypto AES-GCM pro lokální offline vault.
   - **Technologie:** Next.js App Router, WebCrypto API, lokální IndexDB pro offline vault.

3. **`apps/admin` (Synthesis Administrace)**
   - **Odpovědnost:** Centrální správa Synthesis OS: správa uživatelů, RBAC, Module Engine manažer (zapínání/vypínání modulů), prohlížení Audit Ledgeru, Text Registry (CMS) a moderace institucí.
   - **Vizuální identita:** **STRIKTNĚ BRANDOVĚ NEUTRÁLNÍ.** Využívá neutrální systémové UI platformy Synthesis OS (nikoli Blue Brand Táta má právo).
   - **Bezpečnostní hranice:** Vyžaduje roli SuperAdmin nebo Admin, vícefaktorovou autentizaci a auditování každé operace v Control Plane.
   - **Architektonický zákaz:** Žádné přímé spouštění shellových příkazů na VPS ani manipulace s Docker sockety.

4. **`apps/team` (Team Center)**
   - **Odpovědnost:** Koordinační rozhraní pro dobrovolníky a tým spolku Táta má právo pro řešení krizových tiketů z SOS 48h a asistenci rodičům.
   - **Bezpečnostní hranice:** Role-based přístup s principem Least Privilege. Dobrovolník vidí pouze anonymizovaná klientská data nebo data explicitně nasdílená rodičem s jeho souhlasem.

5. **`apps/api` (Centrální modulární backend — SYNAPI)**
   - **Odpovědnost:** Jednotná backendová fasáda poskytující REST/RPC endpointy pro všechny frontendové aplikace. Validace vstupů přes Zod, autentizace (JWT/Sessions/Passkeys), autorizace přes Policy Engine, zápis do Audit Ledgeru a transakční práce s PostgreSQL přes Prisma.
   - **Architektonický princip:** Běží na NestJS s dynamickou registrací modulů přes `packages/module-engine`. **Žádný monolitický `server.ts`!**

6. **`apps/worker` (Asynchronní background worker)**
   - **Odpovědnost:** Provádění dlouhotrvajících úloh mimo hlavní HTTP request-response cyklus: synchronizace e-Sbírky při striktním dodržení Quota Guard (1 req/s, max 5 req/den), generování velkých PDF zpráv z CoParentHubu, odesílání notifikací a asynchronní kontrola procesních lhůt.
   - **Infrastruktura:** **PostgreSQL-backed queue** (např. `pg-boss` transakční fronta běžící přímo nad PostgreSQL). **Žádný Redis ani BullMQ v architektonickém základu!**

---

### 4.2 Balíčky (`packages/*`) dle vrstev

#### Vrstva: Synthesis OS (Platform Core & Platform Services)
1. **`packages/synthesis-core` (Synthesis OS Jádro)**
   - **Odpovědnost:** Základní abstrakce a kontrakty nezávislé platformy: Audit Ledger rozhraní, RBAC oprávnění a role, Policy Engine rozhraní (Default Deny), standardizované Result/Error typy a bezpečný strukturovaný logger.
   - **Závislosti:** Čistá knihovna bez závislostí na doménách, projektech ani CMS.

2. **`packages/module-engine` (Jádro modulárního systému — Platform Service)**
   - **Odpovědnost:** P0 základ pro F1/F2:
     - `ModuleContract` — povinné rozhraní každého doménového modulu.
     - `ModuleManifest` — deklarace metadat, oprávnění a závislostí modulu.
     - `ModuleRegistry` — registrace a runtime evidence modulů.
     - `DependencyResolver` — validace stromu závislostí a detekce cyklů.
     - `LifecycleManager` — řízení stavů (`install`, `enable`, `disable`, `uninstall`).
     - `ModuleGates` — middleware pro Next.js a guardy pro NestJS blokující přístup k neaktivním modulům.
     - `Fallback` — komponenty pro bezpečný a elegantní fallback při vypnutém modulu.
   - **Závislosti:** Závisí výhradně na `@tmpr/synthesis-core`.

3. **`packages/ui` (Brandově neutrální komponentový design systém)**
   - **Odpovědnost:** Znovupoužitelné React komponenty (Button, Input, Modal, Card, Table, Badge atd.) s neutrálním vzhledem pro platformu Synthesis OS a Administraci.
   - **Závislosti:** Žádná vazba na Blue Brand Táta má právo. Přijímá design tokeny přes CSS proměnné.

#### Vrstva: Synthesis CMS
4. **`packages/synthesis-cms` (Obsahový engine)**
   - **Odpovědnost:** Text Registry (revize textů, i18n), šablony právních a procesních dokumentů, články a návody.
   - **Závislosti:** Závisí na `@tmpr/synthesis-core` a `@tmpr/module-engine`. **Nesmí obsahovat žádné doménové pravidla rodinného práva!**

#### Vrstva: Project Package (Táta má právo)
5. **`packages/project-tata-ma-pravo` (Vlastník projektu a brandu)**
   - **Odpovědnost:** Kanonická integrace projektu „Táta má právo“ do platformy Synthesis.
     - Definuje projektový manifest (`projectKey: tata-ma-pravo`).
     - Spravuje seznam aktivovaných doménových modulů (`modules/*`).
     - **VLASTNÍ BRAND PACK:** `packages/project-tata-ma-pravo/brand` obsahuje specifikaci `TMPR-BRAND-BLUE-1.0`, barevné tokeny (`#1e40af` primary), Tailwind preset a originální logo asset `brand.tata-ma-pravo.logo.source`.
   - **Závislosti:** Závisí na `@tmpr/synthesis-core`, `@tmpr/module-engine` a `@tmpr/synthesis-cms`.

#### Sdílené infrastrukturní balíčky
6. **`packages/contracts` (Sdílená DTO a API rozhraní)**
   - **Odpovědnost:** Definice komunikačních smluv mezi `apps/api` a klientskými aplikacemi: Zod validační schémata, TypeScript request/response typy, chybové struktury.
   - **Závislosti:** Závisí na Zod a `@tmpr/synthesis-core`.

7. **`packages/db` (Centrální kompozitní DB vrstva)**
   - **Odpovědnost:** Skládání (kompozice) Prisma schémat ze všech aktivních doménových modulů do jediného výsledného Prisma Clienta pro aplikaci `apps/api` a `apps/worker`. Řízení spouštění modulárních migrací.
   - **DATOVÁ INTEGRITA:** **Není vlastníkem dat.** Každý doménový modul vlastní své schéma, své migrace a svá data.
   - **BEZPEČNOSTNÍ HRANICE:** Smí být importován **VÝHRADNĚ** v `apps/api` a `apps/worker`. Klientské aplikace k němu nemají přístup.

---

### 4.3 Doménové moduly (`modules/*`) a decentralizované vlastnictví dat

Každý modul je autonomní jednotka implementující `ModuleContract` a je **výhradním vlastníkem svých dat**:

```text
modules/<module-name>/
├── package.json              # Subpath exports: "." a "./contract"
├── tsconfig.json
├── prisma/                   # MODULÁRNÍ DATOVÉ VLASTNICTVÍ:
│   ├── schema.prisma         # Vlastní schéma modulu (pouze jeho tabulky a indexy)
│   └── migrations/           # Vlastní verzované migrace patřící modulu
├── src/
│   ├── manifest.ts           # Deklarace modulu (IModuleManifest, verze, oprávnění, závislosti)
│   ├── contract.ts           # VEŘEJNÝ KONTRAKT: typy, eventy, veřejné API modulu
│   ├── server/               # NestJS kontrolery, služby a repozitáře (pouze pro apps/api a worker)
│   ├── client/               # React / Next.js komponenty a hooky (pouze pro apps/*)
│   └── internal/             # INTERNÍ IMPLEMENTACE (STRIKTNĚ ZAKÁZANÝ EXPORT!)
```

Přehled doménových modulů a jejich odpovědnost:
1. **`modules/institutions-registry`** — správa a geodata OSPOD ČR, soudů a advokátů ČAK. Vlastní tabulky institucí.
2. **`modules/family-alimony`** — deterministický výpočet výživného dle tabulek MS ČR a kontrolních částek.
3. **`modules/family-child-care`** — Care Occurrence & Age Engine, generování intervalů péče. Vlastní tabulky rozvrhů péče.
4. **`modules/legal-judgment-parser`** — deterministická pravidly řízená extrakce výroků rozsudků.
5. **`modules/legal-statutes-sync`** — ochrana kvót e-Sbírky (Quota Guard & Lock Guard) a synchronizace zákonů. Vlastní tabulky e-Sbírky.
6. **`modules/support-communication`** — BIFF komunikační validátor (Brief, Informative, Friendly, Firm).
7. **`modules/case-core`** — klientský spis, evidence dětí, procesní lhůty a WebCrypto offline vault. Vlastní tabulky spisu a účastníků.
8. **`modules/coparent-hub`** — potvrzování předání dětí, sdílené výdaje a soudní auditní protokol. Vlastní tabulky předávání a výdajů.
9. **`modules/community-memento`** — památník a databáze kauz Memento otců. Vlastní tabulky mementa.

---

## 5. POVOLENÉ DEPENDENCY SMĚRY

### 5.1 Autoritativní diagram toku závislostí

Směr závislostí je striktně jednosměrný — **pouze shora dolů (od konkrétních domén k obecnější platformě)**:

```text
+---------------------------------------------------------------------------------+
|                                APLIKAČNÍ VRSTVA                                |
|   apps/public   |   apps/case   |   apps/admin   |   apps/team   |  apps/worker |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                         DOMÉNOVÁ VRSTVA (DOMAIN MODULES)                       |
|     institutions-registry | family-alimony | family-child-care | coparent-hub   |
|     legal-judgment-parser | case-core      | support-comm      | memento        |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                     PROJEKTOVÁ VRSTVA (PROJECT PACKAGE)                         |
|   packages/project-tata-ma-pravo (včetně brand packu TMPR-BRAND-BLUE-1.0)       |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                          OBSAHOVÁ VRSTVA (SYNTHESIS CMS)                        |
|                              packages/synthesis-cms                             |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|               PLATFORMNÍ VRSTVA (SYNTHESIS OS PLATFORM SERVICES)                |
|           packages/module-engine       |          packages/ui (neutrální)       |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                  ZÁKLADNÍ JÁDRO (SYNTHESIS OS PLATFORM CORE)                    |
|                            packages/synthesis-core                              |
+---------------------------------------------------------------------------------+
```

### 5.2 Datová a asynchronní architektura (Bez Redisu):
```text
[ Klientské aplikace (Next.js) ]
               |
               v (pouze HTTP / REST / RPC přes DTO z @tmpr/contracts)
       [ apps/api (NestJS) ]
               |
               +-----------------------------------+
               |                                   |
               v (přímý DB import)                 v (enqueue job)
        [ packages/db ]                   [ PostgreSQL Queue Table ]
               |                                   |
               v                                   v (poll / notify)
     [ PostgreSQL 16 DB ] <---------------- [ apps/worker (NestJS) ]
                               (výkon úloh / sync / PDF generování)
```

---

## 6. STRIKTNĚ ZAKÁZANÉ IMPORTY (FORBIDDEN IMPORTS)

Tyto zákazy jsou absolutní a jakékoli jejich porušení způsobí okamžité selhání CI:

| Odkud (Source) | Kam (Forbidden Target) | Důvod zákazu | Kód pravidla v CI |
| :--- | :--- | :--- | :--- |
| `packages/synthesis-core` | `packages/synthesis-cms`<br>`packages/project-*`<br>`modules/*`<br>`apps/*` | **Inverze vrstev (Layer Inversion):** Synthesis OS je nezávislá platforma a nesmí znát žádný projekt ani doménu. | `ERR-ARCH-001` |
| `packages/synthesis-cms` | `packages/project-*`<br>`modules/*`<br>`apps/*` | CMS je obecný nástroj a nesmí importovat klientské ani doménové moduly. | `ERR-ARCH-002` |
| `packages/module-engine` | `modules/*`<br>`packages/project-*` | Jádro Module Engine patří do Synthesis OS a nesmí staticky záviset na konkrétních modulech ani projektech. | `ERR-ARCH-003` |
| `packages/synthesis-*`<br>`apps/admin` | `packages/project-tata-ma-pravo/brand` | **Brand Leakage:** Synthesis OS, CMS a Administrace musí zůstat brandově neutrální. | `ERR-ARCH-004` |
| `modules/<A>` | `modules/<B>/src/internal/*` | **Porušení zapouzdření:** Modul smí importovat z jiného modulu POUZE z `@tmpr/<B>/contract`. | `ERR-ARCH-005` |
| `modules/<A>` | `modules/<B>/contract` *(bez deklarace)* | **Nedeklarovaná závislost:** Modul nesmí importovat cizí kontrakt bez deklarace v `manifest.ts`. | `ERR-ARCH-006` |
| `apps/public`<br>`apps/case`<br>`apps/admin`<br>`apps/team` | `packages/db`<br>`@prisma/client` | **Porušení bezpečnosti dat:** Klientské UI aplikace nesmějí mít přímý přístup k databázi. | `ERR-ARCH-007` |
| Jakýkoli balíček/modul | BullMQ / Redis | **Zákaz Redisu v základu:** První verze používá PostgreSQL-backed queue. | `ERR-ARCH-008` |
| Jakýkoli balíček/modul | Cyklická závislost (`A -> B -> A`) | **Kruhová závislost:** Přenáší riziko rozpadu bundleru a nekontrolovatelných stavů. | `ERR-ARCH-009` |
| Jakýkoli kód | Staré artefakty DEV3 (`server.ts`, `dbStore.ts`) | **Zákaz kontaminace:** DEV3 je pouze čtecí reference, kód se nepřenáší. | `ERR-ARCH-010` |

---

## 7. HRANICE DATOVÉHO VLASTNICTVÍ (DECENTRALIZED DATA OWNERSHIP)

1. **Decentralizované vlastnictví schémat a migrací:**
   - Každý doménový modul spravuje své vlastní tabulky v `modules/<name>/prisma/schema.prisma`.
   - Každý doménový modul obsahuje své migrační skripty v `modules/<name>/prisma/migrations/`.
   - Centrální balíček `packages/db` je pouze **kompozitní nástroj**: automaticky sloučí schémata z aktivních modulů a vygeneruje jednotný Prisma Client pro backend.
2. **Pravidlo jediného vlastníka a zapisovatele (Single Owner & Writer Rule):**
   - Žádný modul nesmí provádět přímý zápis (`INSERT`, `UPDATE`, `DELETE`) ani přímý SELECT do tabulek, které nevlastní.
   - Jakékoli mezimoduální operace musí probíhat přes servisní rozhraní deklarované v kontraktu příslušného modulu nebo prostřednictvím asynchronních doménových událostí.
3. **Audit Ledger jako výjimka s append-only garancí:**
   - Záznamy do `AuditLedger` zapisují všechny autorizované služby výhradně přes `packages/synthesis-core` Audit Service.
   - Tabulka `AuditLedger` je striktně **APPEND-ONLY** (žádné modifikace ani mazání).
4. **Izolace klientských spisů (Tenant/Case Isolation):**
   - Všechny dotazy v `modules/case-core` musí obsahovat striktní filtr `caseId` a `userId` ověřený přes autorizační Policy Engine. Přístup bez ověření vlastnictví je klasifikován jako P0 bezpečnostní incident (IDOR).

---

## 8. UMÍSTĚNÍ SPECIFICKÝCH KOMPONENTŮ A BRANDU

### 8.1 Kde je Project Package „Táta má právo“ a jeho Brand?
- **Kanonická cesta balíčku:** `packages/project-tata-ma-pravo`
- **Kanonická cesta Brand Packu:** `packages/project-tata-ma-pravo/brand`
- **Asset loga:** `packages/project-tata-ma-pravo/brand/assets/brand.tata-ma-pravo.logo.source.png`
- **Důvod provázání:** Vizuální identita `TMPR-BRAND-BLUE-1.0` a logo patří výhradně tomuto projektu. Synthesis OS a Administrace jsou neutrální.

### 8.2 Kde jsou veřejné kontrakty modulů?
- **Kanonická cesta:** V každém modulu v souboru `modules/<module-name>/src/contract.ts`.
- **Export v package.json:**
  ```json
  {
    "name": "@tmpr/family-alimony",
    "exports": {
      ".": "./src/index.ts",
      "./contract": "./src/contract.ts"
    }
  }
  ```
- Ostatní moduly importují POUZE:
  `import { AlimonyCalculationResult } from "@tmpr/family-alimony/contract";`

---

## 9. MECHANISMY CI PRO ZABRÁNĚNÍ NEPOVOLENÝCH ZÁVISLOSTÍ

K ochraně hranic workspace slouží automatizovaná obrana integrovaná do GitHub Actions:

1. **Subpath exports v `package.json`:** Cesty do `src/internal/*` nejsou exportovány.
2. **ESLint zóny (`eslint-plugin-boundaries`):** Vynucuje striktní směr závislostí shora dolů a neutralitu Synthesis OS.
3. **Dependency Cruiser (`.dependency-cruiser.js`):** Hlásí a blokuje cykly, zakázaný import DB z frontendu a neautorizované použití Brand Packu.
4. **Zákaz Redisu v testech:** CI hlídá, že v závislostech nepřebývá žádný balíček `bullmq` ani `ioredis`.
5. **Boundary Test v CI (`pnpm test:boundaries`):** AST validátor kontrolující soulad s touto specifikací.

---

## 10. ARCHITEKTONICKÁ ROZHODNUTÍ (REVIZE R01)

- **Oprava 1 (Brand Ownership):** `TMPR-BRAND-BLUE-1.0` a logo přesunuty z globálního balíčku do `packages/project-tata-ma-pravo/brand`. Synthesis OS zůstává brandově neutrální.
- **Oprava 2 (Database Ownership):** Decentralizované vlastnictví schémat a migrací v `modules/*`. `packages/db` je pouze kompozitní vrstva.
- **Oprava 3 (Module Engine Layer):** Module Engine zařazen do `Synthesis OS / Platform Services`. Hierarchie vrstev a směr závislostí jsou striktně jednosměrné (shora dolů).
- **Oprava 4 (Queue Architecture):** BullMQ a Redis odstraněny ze základu. Zavedena PostgreSQL-backed queue pro `apps/worker`.
- **Status:** **ARCHITECTURE_DECISION_REQUIRED: NONE (Všechny 4 body vyřešeny)**.

---

## 11. ZÁVĚR A NÁVAZNOST
Tato specifikace po revizi R01 představuje kompletní a schválenou architektonickou kostru.
Následující úkol: **TMPR-NEWDEV-20260911-F1-002 (Definovat Module Contract a Module Manifest)**.
