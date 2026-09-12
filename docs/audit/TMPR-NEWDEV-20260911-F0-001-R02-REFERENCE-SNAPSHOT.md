# REFERENČNÍ SNAPSHOT A INVENTÁŘ DEV3

## 1. TASK METADATA
- **ROOT TASK ID:** TMPR-NEWDEV-20260911-F0-001
- **TASK ID:** TMPR-NEWDEV-20260911-F0-001-R02
- **TITLE:** Načtení DEV3 a referenční inventář
- **DATE:** 2026-09-11
- **MODE:** STRICT READ-ONLY AUDIT
- **PROJECT:** Táta má právo / Synthesis
- **PHASE:** F0 — Inventář
- **PRIORITY:** P0
- **SOURCE ENVIRONMENT:** DEV3
- **SOURCE REPOSITORY:** https://github.com/jirisar7-eng/dev3
- **PREVIOUS RESULT:** BLOCKED — source repository nebyl ve workspace dostupný (prázdná výchozí kostra /app/applet).
- **RECOVERY REASON:** Autoritativní DEV3 byl bezpečně načten/naklonován pomocí GitHub Secretu bez uložení tokenu do historie či konfiguračních URL.

---

## 2. SOURCE REPOSITORY VERIFICATION
- **Expected Repository:** https://github.com/jirisar7-eng/dev3
- **Actual Origin:** `https://github.com/jirisar7-eng/dev3.git`
- **Working Directory:** `/tmp/dev3` (autoritativní klon) & `/app/applet` (AI Studio sandbox)
- **Branch:** `main`
- **HEAD SHA:** `696df6255dfe1e0f1ac21a02b002999b557629e4`
- **Last Commit:** `696df62 feat(compliance): integrate Legal Pack 2.0 DEV3 draft preview and GDPR hardening [TMPR-20260910-DEPLOY-002]`
- **Last Commit Date:** Thu Sep 10 08:49:27 2026 +0000
- **Last Commit Author:** AI Studio Agent <bot@tatovacesta.cz>
- **Repository Safety Gate Match:** ✅ **PASS**

---

## 3. EXECUTIVE SUMMARY
Provedena detailní a striktně **READ-ONLY** inventarizace stávajícího referenčního repozitáře DEV3. Repozitář představuje robustní, ale silně monolitický systém kombinující vrstvu **Synthesis Core / Platform** a specifickou doménu **Táta má právo**.

Hlavním zjištěním auditu je, že DEV3 obsahuje obrovskou hodnotu v podobě:
1. **Validovaných datových sad** (soudy, OSPOD, ČAK advokáti, vzory podání Legal Pack 2.0, právní průvodci, Memento otců),
2. **Specializovaných výpočetních a procesních enginů** (kalkulačka výživného, care occurrence engine, e-Sbírka synchronizace a quota guard, deterministický parser rozsudků),
3. **Funkčních doménových konceptů** (Můj případ s trezorem důkazů a kalendářem péče, CoParentHub s režimy konfliktu a auditovaným protokolem předávání, komplexní administrační centrum Synthesis).

Zároveň DEV3 trpí těžkým **architektonickým a technickým dluhem**:
- Monolitický `server.ts` o délce **5 584 řádků** s 274 přímými endpointy,
- Dvojkolejné datové toky (paralelní `dbStore.ts` o velikosti 177 KB vedle 139 Prisma modelů),
- Monolitické komponenty o velikosti až 114 KB (`QADashboard.tsx`, `RegistrSubjektu.tsx`, `SubjektManager.tsx`),
- Chybějící standardní router (navigace řízená přes ad-hoc `useState` a `window.location.pathname`),
- Těsné svázání Synthesis Core a domény Táta má právo.

**Závěr pro nový vývoj:**  
Nový DEV nesmí být refaktorem ani redesignem DEV3. Nový DEV musí být čistou modulární přestavbou (monorepo, Next.js App Router, NestJS API, PostgreSQL/Prisma, MinIO, ClamAV, Synthesis Design System), do níž se převezmou doménové algoritmy, data a testy, zatímco stará monolitická konstrukce se vyřadí.

---

## 4. GIT SNAPSHOT
- **Remote Origin URL:** https://github.com/jirisar7-eng/dev3.git
- **Current Branch:** `main`
- **HEAD Commit SHA:** `696df6255dfe1e0f1ac21a02b002999b557629e4`
- **Pre-existing Worktree Changes:** ŽÁDNÉ (čistý pracovní strom).
- **Reprodukovatelnost:** Plně reprodukovatelný snapshot vázaný na HEAD `696df62`.

---

## 5. REPOSITORY INVENTORY (STATISTIKY A POČTY)
- **Celkový počet trackovaných souborů:** 1 037 souborů
- **Celkový objem řádků kódu a dokumentace:** 267 507 řádků
- **TypeScript soubory (.ts):** 346 souborů
- **React / TSX soubory (.tsx):** 244 souborů
- **Markdown dokumenty a audity (.md):** 369 souborů
- **SQL skripty a baseline (.sql):** 13 souborů
- **CommonJS skripty (.cjs):** 19 souborů
- **JavaScript skripty (.js):** 6 souborů
- **JSON konfigurační a datové soubory:** 6 souborů
- **Prisma schema soubory:** 1 soubor (`prisma/schema.prisma`, 100 816 bajtů)
- **Prisma migrace:** 9 aplikovaných migrací + 1 kanonický baseline (`20260909_canonical_main`)
- **Webové assety (obrázky, ikony, fonty):** 14 souborů (5x PNG, 7x WOFF2, 1x ICO, 1x SVG)
- **PWA soubory:** `manifest.json`, `sw.js`, `offline.html`
- **Největší zdrojové soubory v projektu:**
  1. `server.ts` — 205 122 bajtů (5 584 řádků)
  2. `src/data/legalDrafts20.ts` — 187 759 bajtů (Legal Pack 2.0 vzory)
  3. `src/services/dbStore.ts` — 177 540 bajtů (legacy fallback store)
  4. `prisma/baselines/20260909_canonical_main/baseline.sql` — 130 916 bajtů
  5. `src/data/ospodDataset.json` — 121 701 bajtů (dataset OSPOD v ČR)
  6. `src/components/admin/qa/QADashboard.tsx` — 114 487 bajtů
  7. `src/services/cmsService.ts` — 111 645 bajtů
  8. `prisma/schema.prisma` — 100 816 bajtů
  9. `src/components/public/RegistrSubjektu.tsx` — 96 097 bajtů
  10. `src/components/admin/SubjektManager.tsx` — 89 118 bajtů

---

## 6. FRONTEND INVENTORY

### A. Veřejný portál (`src/components/public/`, `src/pages/`)
- **Obsah a články:** `ArticlesSection`, `ArticleDetailView`, `FaqSection`, `CmsPageRenderer`, `PageRenderer`
- **Kalkulačky:** `AlimonyCalculatorView` (výpočet výživného dle doporučujících tabulek MS ČR)
- **Registry a mapy:**
  - `RegistrSubjektu`, `MapaSubjektuView`, `SubjektyMap` (databáze OSPOD, okresních a krajských soudů, advokátů a mediátorů s geokódováním a filtry)
- **Veřejná akademie:** `QuizzesView`, `StudiesView`, `VideothequeView`, `WikiView` (právní slovník a pojmy)
- **Právní průvodci (Legal Guides):**
  - `AgendaView`, `AppealsGuideView`, `CaseFileGuideView`, `CaseLawView`, `CourtGuideView`, `DocumentsView`, `EnforcementGuideView`, `ExpertReportsGuideView`, `HealthcareGuideView`, `InternationalDisputesGuideView`, `LegalGuideDynamicView`, `OspodGuideView`, `RightsView`, `SchoolsGuideView`, `StateLawsView`, `StateStatisticsView`, `StudyLibraryPage`
- **Krizové a komunitní nástroje:**
  - `CrisisCommunityPortal`, `ForumView`, `LegalHelpView`, `CaseStoriesView`, `SupportView`
  - `SosPlanView`, `SosPlan48HoursView` (akční krizový manuál prvních 48 hodin po odebrání dítěte)
  - `MementoView`, `MementoHomeView`, `MementoCaseDetailView`, `MementoThematicView` (Memento otců)
- **Speciální metodické nástroje:**
  - `BiffCommunicationView` (trénink a kontrola komunikace metodou BIFF)
  - `KalendarLhutView` (lhůtník procesních úkonů)
  - `MajetekView` (vypořádání SJM a nákladů)
  - `PsychologieView` (syndrom odcizení, dopady rodičovských konfliktů)
- **Spolek a podpora:** `FounderStoryPage`, `SupportUsPage`, `VolunteersPage`, `VolunteerCodexPage`, `VolunteerAgreementPage`
- **Compliance & GDPR:** `GdprComplianceCenterPage`, `PublicComplianceView`, `SharedAuditView`

### B. Můj účet (`src/components/private/`)
- **Komponenty správy identity:**
  - `UserProfileView` (správa hesla, 2FA/TOTP, Passkeys/WebAuthn, propojené účty)
  - `UserAppearanceTab` (vzhled a téma)
  - `UserSubmissionsTab` (přehled odeslaných formulářů a žádostí)
  - `UserSettingsView` (globální uživatelské předvolby)
  - `UserSupportTicketingView` (podpora a tikety uživatele)

### C. Můj případ (`src/pages/MyCasePage.tsx`, `src/components/case/`)
Spis klienta rozdělený do 13 funkčních záložek:
1. `overview` (Přehled spisu a stav kauzy)
2. `care` (Péče o dítě a harmonogram)
3. `children` (Evidence dětí ve spisu)
4. `calendar` (Kalendář péče, předávání a střídání)
5. `documents` (Trezor dokumentů, podání, rozhodnutí)
6. `events` (Procesní události spisu)
7. `proceedings` (Soudní a opatrovnické řízení, OSPOD)
8. `tasks` (Úkoly a procesní lhůty)
9. `notes` (Deník otce / strukturované zápisky)
10. `evidence` (Katalog důkazů s hashováním a metadaty)
11. `timeline` (Časová osa kauzy)
12. `security` (Šifrování spisu a správa klíčů)
13. `offline-sync` (Offline synchronizace a kontrola trezoru)

### D. CoParentHub (`src/pages/portal/CoParentPage.tsx`, `src/components/coparent/`)
Sdílená rodičovská zóna:
- Párování rodičů pomocí 6místného kódu (`InviteModal`)
- Přepínání **Režimu konfliktu (ConflictMode)**:
  - 🟢 `COOPERATION` (volná komunikace a koordinace)
  - 🟡 `DISAGREEMENT` (schvalování výdajů a změn kalendáře)
  - 🔴 `HIGH_CONFLICT` (vypnut volný chat, pouze strukturované auditované žádosti)
- Kalendář péče a předávání dětí
- Schvalování mimořádných a běžných výdajů (`CoParentExpense`)
- Generování a tisk auditního protokolu pro soud/OSPOD (`AuditPrintView`)
- Import rozsudků (`JudgmentImportModal`)

### E. Administrace (`src/components/admin/AdminDashboard.tsx`)
Monolitický administrační dashboard s **35 taby**:
- `overview`, `project-control` (Synthesis Project Control Center)
- `pages`, `templates`, `page-builder` (Puck CMS editor)
- `texts` (správa textových konstant), `theme` (barvy a proměnné), `branding` (Brand Studio, Visual SVG editor)
- `cms`, `custom-modules`, `modules`, `users` (RBAC, role, práva)
- `esbirka` (správa e-Sbírky, synchronizace, kvóty)
- `state-admin` (státní registry, otevřená data Justice, ČSÚ)
- `subjekty`, `schvalovani-kontaktu` (moderace a schvalování profilů)
- `operations-overview`, `vps`, `mailcow`, `dns`, `github` (infrastruktura a provoz)
- `qa` (QADashboard, testy), `copilot`, `orion` (Orion Trace Center, mind mapy, telemetry), `experimenty`, `ai-context`, `tests`
- `audit`, `audits`, `compliance`, `sponsors`, `settings`

### F. Team Center (`src/components/team/TeamCenterDashboard.tsx`)
Pracovní prostor spolku:
- `tickets` (spolkové tikety a úkoly)
- `overview` (přehled aktivit)
- `volunteers` (správa dobrovolníků, kodexy, dohody)
- `knowledge` (spolková znalostní báze)

---

## 7. BACKEND INVENTORY

### A. Exekutivní architektura
- **Server:** Monolitický Express server v `server.ts` (5 584 řádků).
- **Routy:**
  - 274 přímých `app.(get|post|put|delete|patch)` definic v `server.ts`.
  - 24 modulárních route souborů v `src/routes/` obsahujících dalších **214 endpointů**.
  - Celkem **~488 API endpointů**.

### B. Klíčové služby a enginy (`src/services/`)
- **Agentura a AI infrastruktura:** `agentDispatcher.ts`, `agentRegistry.ts`, `agentCapabilityCatalog.ts`, `dataAnalystHandler.ts`, `documentProcessorHandler.ts`, `synthesisMultiAIOrchestrator.ts`, `geminiProvider.ts`, `grokProvider.ts`, `groqProvider.ts`, `consensusEngine.ts`.
- **Konektory a data pipelines:**
  - ARES: `AresApiClient.ts`, `AresNormalizer.ts`, `AresValidator.ts`
  - ČAK: `cakLiveConnector.ts`, `cakHtmlParser.ts`, `cakAcquisitionPipeline.ts`
  - Soudy / Justice: `soudyPopulationPipeline.ts`, `JusticeOpenDataConnector.ts`
  - e-Sbírka: `EsbirkaApiClient.ts`, `EsbirkaSyncEngine.ts`, `EsbirkaQuotaGuard.ts`, `EsbirkaLockGuard.ts`, `EsbirkaChangeDetector.ts`
  - ČSÚ / NKOD: `CsuNkodConnector.ts`, `StateAdminHubService.ts`
- **Care Engine:** `carePlanService.ts`, `ageEngine.ts`, `careMetricsEngine.ts`, `careOccurrenceEngine.ts`, `geoRoutingService.ts`.
- **Case & Legal:** `clientCaseService.ts`, `submissionDraftService.ts`, `coparentService.ts`, `deterministicJudgmentParser.ts`.
- **Audit & Governance:** `auditRegistryEngine.ts`, `databaseAuditService.ts`, `infrastructureAuditService.ts`, `knowledgeMirrorService.ts`, `releaseGateService.ts`, `controlPlaneService.ts`, `controlPlaneRiskEngine.ts`.
- **Security & Storage:** `clamAvService.ts` (antivirová kontrola uploadů), `minioStorageService.ts` (S3 MinIO objektové úložiště), `passkeyService.ts`, `totpService.ts`, `authService.ts`.
- **Klientský offline trezor:** `src/services/offline/CryptoService.ts`, `SecureDB.ts`, `OfflineSyncService.ts` (AES-GCM WebCrypto šifrování v IndexedDB).

---

## 8. DATABASE INVENTORY (PRISMA SCHEMA)
- **Celkem modelů:** 139 modelů
- **Celkem enumů:** 34 enumů
- **Kategorizace modelů:**
  1. *Identita a Autentizace (6):* `User`, `Passkey`, `UserProfile`, `UserDocumentData`, `UserPreference`, `AccountStatus` (enum).
  2. *RBAC a Práva (4):* `Role`, `Permission`, `UserRole`, `RolePermission`.
  3. *CMS a Obsah (11):* `Page`, `PageSection`, `Category`, `Article`, `FAQ`, `NavigationItem`, `Media`, `ContentString`, `Theme`, `ThemeVariable`, `PageTemplate`.
  4. *Modulární systém (3):* `Module`, `ModuleSetting`, `ModulePermission`, `CustomModule`.
  5. *GDPR, Právní rámec a Consent (8):* `LegalDocument`, `LegalDocumentVersion`, `Consent`, `CookieConsent`, `UserConsentLog`, `SensitiveAccessLog`, `GdprDeletionRequest`, `LegalAuditLog`.
  6. *Audit a Systém (6):* `SystemSetting`, `AuditLog`, `AuditDocument`, `AuditShare`, `AuditFinding`, `ReleaseGate`.
  7. *Legacy User Case (5):* `UserCase`, `UserChild`, `UserCalendarEvent`, `UserNote`, `UserDocument`.
  8. *Státní data, Legislativa a E-Sbírka (8):* `Study`, `Law`, `LegalAct`, `LegalActSection`, `LegalActVersion`, `LegalSyncAudit`, `EsbirkaQuotaAudit`, `StateStatistic`, `CourtCase`.
  9. *Spolek, Dobrovolníci, Partneři (6):* `Partner`, `VolunteerCodexAgreement`, `VolunteerApplication`, `PollVote`, `FormSubmission`, `ForumThread`, `ForumPost`.
  10. *Registr subjektů a Kontakty (5):* `Subjekt`, `SubjectVerifiedProfile`, `SubjectInformationSource`, `Pracovnik`, `Review`.
  11. *Pokročilý spis klienta / Case Management (13):* `Case`, `CaseSubmissionDraft`, `CaseSubmissionDraftVersion`, `CaseParticipant`, `Child`, `CaseEvent`, `CaseDeadline`, `CaseTask`, `CaseNote`, `CaseDocument`, `CaseEvidence`, `CaseCommunication`, `CareArrangement`.
  12. *CoParentHub / Sdílené rodičovství (14):* `CoParentSpace`, `CoParentMember`, `CoParentChild`, `CoParentEvent`, `CoParentHandover`, `CoParentMessage`, `CoParentAgreement`, `CoParentExpense`, `CoParentDailyUpdate`, `CoParentItem`, `CoParentRequest`, `CoParentAuditLog`, `CoParentDocument`, `CoParentInvite`.
  13. *Care Engine (6):* `CarePlan`, `CarePlanChild`, `CareLocation`, `CareDay`, `CareHolidayRule`, `CareSimulationComparison`.
  14. *QA Engine a Testovací centrum (9):* `QAProject`, `QAModule`, `QAEndpoint`, `QARun`, `QAFinding`, `QARegistryItem`, `QADependency`, `QAAICache`, `QAAIStats`.
  15. *Znalostní báze, Vzdělávání, Memento (9):* `NewsItem`, `WikiTerm`, `LegalGuide`, `LegalGuideChapter`, `AcademyVideo`, `Quiz`, `QuizQuestion`, `MementoCase`, `SupportTicket`, `SupportTicketMessage`.
  16. *Judikatura a Precedenty (3):* `Judgment`, `JudgmentSentence`, `JudgmentLegalFact`.
  17. *Synthesis Branding System (12):* `BrandingVersion`, `BrandFamily`, `AppIdentity`, `BrandProfile`, `BrandAsset`, `BrandAssetVersion`, `BrandRelease`, `BrandReleaseAsset`, `DocumentBrandingProfile`, `BrandedDocumentExport`, `BrandCampaign`, `BrandCampaignTarget`.
  18. *Synthesis Control Plane (6):* `SynthesisTicket`, `SynthesisTicketComment`, `SynthesisTicketEvent`, `ControlPlaneAction`, `ControlPlaneEvent`, `ControlPlaneSnapshot`.

---

## 9. DATA VOLUME SUMMARY
- **Stav:** **DATA VOLUME NOT VERIFIED**
- **Důvod:** Autoritativní databáze PostgreSQL běží na serveru DEV3 (VPS). V prostředí AI Studio běží izolovaný kontejner bez přímého síťového propojení na produkční/vývojovou databázi DEV3.
- **Bezpečnostní limit:** Žádné pokusy o obcházení síťové izolace nebyly v souladu s bezpečnostními pravidly prováděny.

---

## 10. CMS A CONTENT INVENTORY
- **Vizuální editor:** Puck CMS editor (`src/puck/`, `src/PuckEditorView.tsx`, `src/components/builder/puck.config.tsx`).
- **Statické datové datasety (kandidáti na PŘEVÉST NA DATA / PŘEVZÍT):**
  - `src/data/ospodDataset.json` (121.7 KB) — kompletní adresář OSPOD v ČR
  - `src/data/soudyDataset.ts` (50.7 KB) — databáze okresních, krajských a vrchních soudů
  - `src/data/cakAdvokatiDataset.ts` (23.8 KB) — ověřený seznam advokátů pro rodinné právo
  - `src/data/legalDrafts20.ts` (187.8 KB) — vzory návrhů na svěření do péče, střídavou péči, úpravu výživného
  - `src/data/legalGuidesSeed.ts` (60.8 KB) — průvodci soudním jednáním, odvoláním, znaleckými posudky
  - `src/data/wikiSeed.ts` (48.5 KB) — právní slovník a terminologie
  - `src/data/mementoSeed.ts` (15.5 KB) — strukturované kauzy Memento otců
  - `src/data/quizzesSeed.ts`, `videosSeed.ts` — vzdělávací materiály
- **Hardcoded texty:** Veřejné komponenty (`Hero.tsx`, `PublicPortal.tsx`, `BiffCommunicationView.tsx`, `MajetekView.tsx`) obsahují stovky řádků přímo zapsaného českého textu, který v novém systému patří do **Synthesis Text Registry / Help Registry**.

---

## 11. ASSET INVENTORY
- **Ikony a loga (`public/`):**
  - `favicon.ico` (565 KB), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`
  - `icon-192x192.png`, `icon-512x512.png`, `icon.svg`
- **PWA manifest a offline:**
  - `public/manifest.json` (název aplikace, barvy, ikony)
  - `public/sw.js` (Service Worker pro cache a offline fallback)
  - `public/offline.html` (fallback offline stránka)
- **Typografie (`public/fonts/`):**
  - **Playfair Display:** `playfair-display-regular.woff2`, `playfair-display-600.woff2`, `playfair-display-700.woff2`
  - **Plus Jakarta Sans:** `plus-jakarta-sans-400.woff2`, `plus-jakarta-sans-500.woff2`, `plus-jakarta-sans-600.woff2`, `plus-jakarta-sans-700.woff2`
- **SVG Branding Editor:** `src/components/admin/svg/` (vlastní Canvas, serializer, parser a history stack pro správu SVG brandových aktiv).

---

## 12. TEST INVENTORY
- **Celkový počet testovacích souborů:** 127 souborů
- **Struktura testů:**
  - *Bezpečnost a RBAC (11 testů):* např. `auth-remediation-phase05b.test.ts`, `agent-authorization-contract-phase1b.test.ts`, `offline-security.test.ts`, `prisma-fail-closed.test.ts`, `gdpr-security-remediation-phase025.test.ts`, `preview-auth-contract.test.ts`.
  - *Agenti a Orion (13 testů):* `agent-dispatcher-phase1c.test.ts`, `orion-safety-bridge.test.ts`, `orion-trace-phase6b.test.ts`, `document-processor-phase2c.test.ts`, `ai-provider-consistency.test.ts`.
  - *Legislativa, e-Sbírka a soudy (19 testů):* `esbirka-phase3/4`, `legal-pack-2-0-*.test.ts`, `soudy-data-population.test.ts`, `cak-live-connector.test.ts`, `judgment-case-sync.test.ts`.
  - *Péče, kalkulačka a spisy (7 testů):* `alimonyCalculator.test.ts`, `care-occurrence-engine.test.ts`, `case-submission-drafts-phase21-1.test.ts`, `offline-sync-queue-phase21-2.test.ts`.
  - *Control Plane a infrastruktura (9 testů):* `control-plane-foundation.test.ts`, `control-plane-ticket-risk.test.ts`, `infrastructure-audit-phase6e.test.ts`, `vps-diagnostic-bridge.test.ts`.
  - *QA, Analytics a Audity (8 testů):* `audit-registry-engine.test.ts`, `audit-finding-db-persistence.test.ts`, `analytics-2-user-journey.test.ts`.
  - *CMS, Branding a PWA (12 testů):* `branding-api.test.ts`, `branding-editor.test.ts`, `pwa-offline-sync-ui-phase22.test.ts`, `pwa-install-prompt.test.ts`.
  - *Ostatní integrační a regresní testy (48 testů).*

---

## 13. AUDIT INVENTORY
- **Celkový počet Markdown auditů:** 339 souborů
  - `docs/audit/`: 286 souborů (záznamy etap, auditních běhů, bezpečnostních a migračních zjištění)
  - `audits/`: 37 souborů (analýzy větví, master project audity, offline bezpečnost, agentní kontrakty)
  - `docs/audits/`: 16 souborů
- Existující audity tvoří kanonickou historii předchozího vývoje a zůstávají **striktně neměnné (immutable)**.

---

## 14. SENSITIVE DATA MIGRATION INVENTORY
Oblasti podléhající přísnému režimu ochrany osobních údajů (GDPR, rodinné právo):
1. **Identita a přístupy:** Hesla (bcrypt hashe), WebAuthn/Passkeys veřejné klíče a credential ID, TOTP tajné klíče, záložní kódy, session tokeny.
2. **Spis klienta (MyCase):** Identifikační údaje dětí, rodná čísla, adresy, opatrovnické posudky, důkazy (fotografie, audia, nahrávky), záznamy komunikace s OSPOD a soudy.
3. **CoParentHub:** Soukromé zprávy mezi rodiči, záznamy o předávání dětí, finanční vypořádání, dohody a spory.
4. **Trezor souborů a MinIO úložiště:** PDF rozsudků, naskenované spisy, lékařské zprávy dětí, znalecké posudky.
5. **GDPR a consent logy:** Žádosti o výmaz (`GdprDeletionRequest`), záznamy o přístupu k citlivým datům (`SensitiveAccessLog`).
6. **Offline šifrovaný trezor:** Klientské klíče a data v IndexedDB vyžadující bezpečné smazání/migraci.

---

## 15. KNOWN SECURITY DEBT
- **Monolitický server.ts:** Soustředění veřejných, uživatelských, administračních i systémových operací v jednom souboru zvyšuje riziko chybné autorizace.
- **Přímé ovládání VPS:** Endpointy `/api/admin/vps` a nástroje `vpsDiagnosticBridge.ts` představují vysoké riziko v případě kompromitace admin účtu.
- **Dvoukolejná databáze (`dbStore.ts`):** Koexistence in-memory fallback storu s Prismou vytváří riziko obcházení autorizačních pravidel a nekonzistence dat.
- **Nejednotná kontrola objektového vlastnictví (IDOR):** V některých routách se kontroluje pouze existence přihlášeného uživatele bez důsledného ověření vlastnictví spisu (`case.userId === currentUserId`).
- **Webhooks bez jednotného cryptographic guardu:** Nutnost sjednotit HMAC validace u všech webhooků (`/api/webhook/deploy`, `/api/webhooks/github`).

---

## 16. KNOWN ARCHITECTURAL DEBT
- **Vite SPA + Express namísto moderního full-stack monorepa:** Chybí čisté oddělení API vrstvy a prezentační vrstvy.
- **Extrémně velké monolitické komponenty:** `QADashboard.tsx` (114 KB), `RegistrSubjektu.tsx` (96 KB), `SubjektManager.tsx` (89 KB) — nutno rozpadnout do menších modulů.
- **Provizorní routování v `App.tsx`:** Založeno na ručním odchytávání `popstate` a přepínání `AppView` stavů bez URL podpory pro hluboké odkazy.
- **Svázání Synthesis Platform a domény Táta má právo:** Synthesis CMS a administrační funkce jsou pevně propleteny s právními moduly rodinného práva.
- **Hardcoded texty:** Výrazný podíl uživatelských textů není spravovatelný přes CMS.

---

## 17. DEV3 → NEW DEV MIGRATION RISKS
1. **Riziko přenosu monolitického schématu:** Pokus migrovat všech 139 modelů naráz by přenesl strukturální dluh do nového systému.
2. **Riziko ztráty citlivých klientských spisů:** Přechod na nové datové schéma vyžaduje striktní paritní mapování a ověření integrity.
3. **Riziko kolize PWA a offline trezoru:** Změna domény, Service Workeru nebo šifrovacích klíčů může zneplatnit offline data klientů.
4. **Riziko závislosti na externích zdrojích:** e-Sbírka má striktní limit (1 req/s, max 5 req/den); synchronizační engine musí být v novém DEV od počátku chráněn lock/quota guardem.

---

## 18. WHAT IS WORTH KEEPING (CO JE HODNOTNÉ K ZACHOVÁNÍ)
- **Doménová data a registry:** Datasets soudů ČR, OSPOD, ČAK advokátů.
- **Právní obsah a vzory:** Právní průvodci, vzory podání Legal Pack 2.0, Memento otců, wiki pojmy.
- **Ověřená byznys logika:**
  - Výpočetní engine výživného (`alimonyCalculator`),
  - Care occurrence & age engine pro přesné plánování péče,
  - Quota guard a parser pro e-Sbírku,
  - Deterministický parser soudních rozhodnutí,
  - BIFF komunikační pravidla.
- **Typografie a designové základy:** Fonty Playfair Display a Plus Jakarta Sans, design tokens tmavého a světlého schématu.
- **Bezpečnostní a regresní testy:** Zejména 11 bezpečnostních/RBAC testů a 19 testů legislativy.

---

## 19. WHAT SHOULD BE REBUILT (CO STOJÍ ZA PŘEPSÁNÍ)
- **Frontend portály:** Čistá implementace v Next.js (App Router, Server Components):
  1. Veřejný portál Táta má právo,
  2. Klientský portál Můj případ (s přísnou izolací spisu),
  3. CoParentHub (s čistým real-time/event-driven rozhraním),
  4. Synthesis Administrace,
  5. Team Center.
- **Backend API:** Modulární NestJS backend s OpenAPI / Swagger dokumentací, striktním DTO mapováním a dependency injection.
- **Routování a navigace:** Nahrazení ad-hoc stavů v `App.tsx` standardním URL směrováním.
- **Autentizace a autorizace:** Centralizovaný Auth Service s podporou MFA/Passkeys a přísným IDOR guardem.
- **Ukládání dokumentů:** Čisté napojení na S3/MinIO s ClamAV virovým skenováním a asynchronním zpracováním.

---

## 20. WHAT SHOULD NOT BE CARRIED OVER (CO NEPŘENÁŠET / BALAST)
- **Monolitický server.ts:** 5 584 řádků starého Express kódu.
- **dbStore.ts:** 177 KB in-memory/JSON fallback storu.
- **Ad-hoc patch a fix skripty v kořeni:** `fix_brace.cjs`, `fix-divergence.cjs`, `patch_ui.cjs`, `fix_mycase_sync.cjs` apod.
- **Jednoúčelové kořenové testy:** `test-jwt.js`, `test-status.cjs`, `test-github-status.cjs`.
- **Přímé VPS management skripty z webového UI.**

---

## 21. UNKNOWN / REQUIRES DECISION
- **Zachování CustomModule systému:** Zda v novém DEV zachovat dynamické pluginy (`CustomModule`, `ModuleSetting`), nebo přejít na staticky typované modulární balíčky (pnpm packages).
- **Multi-AI orchestrátor:** Zda orchestrátor Grok/Groq/Gemini přenášet hned v F1, nebo odložit až po stabilizaci core platformy.
- **Puck Editor integrace:** Zda integrovat Puck ihned do Next.js, nebo začít se statickými šablonami a Puck připojit jako CMS rozšíření později.

---

## 22. PRELIMINARY MIGRATION CANDIDATES
- **PŘEVZÍT:** `ospodDataset.json`, `soudyDataset.ts`, ČAK konektor, e-Sbírka quota guard, kalkulačka výživného, care metrics engine, fonty Playfair Display a Plus Jakarta Sans.
- **PŘEVÉST NA DATA:** `legalDrafts20.ts`, `legalGuidesSeed.ts`, `wikiSeed.ts`, `mementoSeed.ts`, `quizzesSeed.ts`, články a FAQ.
- **PŘEPSAT:** Frontend portál (Next.js), Spis klienta, CoParentHub, Backend API (NestJS), Auth & RBAC, Trezor dokumentů (MinIO + ClamAV).
- **SLOUČIT:** Auditní logy (`AuditLog`, `LegalAuditLog`, `CoParentAuditLog`), Subjekty a Verified profily, sloučení `UserCase` do `Case`.
- **ODLOŽIT:** Multi-AI konsenzuální orchestrátor, pokročilý Puck block builder, VPS operations management.
- **VYŘADIT:** `server.ts`, `dbStore.ts`, ad-hoc patch skripty (`fix_*.cjs`).
- **NEURČENO:** Dynamický modulární runtime (`CustomModule`).

---

## 23. NEXT TASK RECOMMENDATION
1. **TMPR-NEWDEV-20260911-BRAND-001:** Zafixování projektového Brand Packu (loga, barvy, typografie, design tokens), aby byl uzamčen designový základ před zahájením vývoje nového UI.
2. **TMPR-NEWDEV-20260911-F0-002:** Autorita paritní a migrační rozhodovací matice (definitivní schválení statusů PŘEVZÍT / PŘEPSAT / PŘEVÉST NA DATA / VYŘADIT).
