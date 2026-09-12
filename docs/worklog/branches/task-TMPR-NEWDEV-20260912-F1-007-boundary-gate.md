# BRANCH WORKLOG: task/TMPR-NEWDEV-20260912-F1-007-boundary-gate

**TASK ID:** TMPR-NEWDEV-20260912-F1-007
**BACKLOG:** NEWDEV-15
**PHASE:** F1 — Kontrakty
**PURPOSE:** Architecture Boundary / Forbidden Import Gate — automatická CI kontrola architektonických hranic DEV4.
**WHY:** Ochrana monorepa před architektonickou erozí, nechtěnými inverzemi závislostí mezi vrstvami (OS, CMS, Project, Domain), únikem brandu, nedovoleným přístupem k internals jiných modulů a neautorizovaným přístupem frontendu k DB/Prisma.
**BASE BRANCH:** main
**BASE COMMIT:** ddb79f1092e06c7e3f898fe717c1bf2182bcfb46
**WORK BRANCH:** task/TMPR-NEWDEV-20260912-F1-007-boundary-gate
**STATUS:** IMPLEMENTED_LOCAL_PASS

**COMPLETED:**
- Verifikace repo safety a baseline commitu `ddb79f1`
- Vytvoření pracovní větve `task/TMPR-NEWDEV-20260912-F1-007-boundary-gate`
- Analýza autoritativního dokumentu `docs/architecture/TMPR-NEWDEV-WORKSPACE-BOUNDARIES-1.0.md`
- Vytvoření samostatného balíčku `packages/boundary-gate` s TypeScript AST parserem (`ast-parser.ts`), klasifikátorem vrstev (`classifier.ts`), pravidly architektury (`rules.ts`), skenerem souborů (`scanner.ts`) a CLI rozhraním (`cli.ts`)
- Implementace architektonických pravidel:
  - `ERR-ARCH-001`: Synthesis OS nesmí importovat CMS, Project Package ani Domain Modul
  - `ERR-ARCH-002`: Synthesis CMS nesmí importovat Project Package ani Domain Modul
  - `ERR-ARCH-003`: Směrování závislostí shora dolů (Project/Domain -> CMS -> Synthesis OS)
  - `ERR-ARCH-004`: Brand leakage — obecné a neutrální balíčky nesmějí importovat projektový brand
  - `ERR-ARCH-005`: Zapouzdření modulů — zákaz importu interních implementací cizího modulu mimo schválené veřejné kontrakty (`@tmpr/<modul>/contract`)
  - `ERR-ARCH-007`: Klientské aplikace nesmí přímo importovat Prisma/databázi
  - `ERR-ARCH-008`: Zákaz nepovolených balíčků (Redis, BullMQ)
- Zabezpečení proti obcházení pravidel relativními importy, re-exporty (`export * from ...`), dynamickými importy (`await import(...)`) i `require(...)`
- Vytvoření kompletní testovací sady (20 testů) pokrývající všech 10 povinných scénářů a fixtures
- Konfigurace kořenového `package.json` s příkazem `test:boundaries`, `tsconfig.json` s projektovou referencí a integrace do CI workflow `.github/workflows/ci.yml`
- Lokální ověření:
  - `pnpm turbo run build typecheck test lint --force` -> 8/8 úloh SUCCESS, 160/160 testů PASS (140 module-engine, 20 boundary-gate)
  - `pnpm test:boundaries` -> SUCCESS (32 souborů zkontrolováno, 92 importů, 0 porušení)

**REMAINING:**
- Commit implementace na pracovní větvi a push na origin
- Ověření remote branch HEAD a merge pracovní větve do main
- Push do origin/main a sledování GitHub Actions Node 24 CI
- Vytvoření auditního reportu `docs/audit/TMPR-NEWDEV-20260912-F1-007.md`
- Synchronizace pracovní větve na finální main HEAD

**BLOCKERS:** none

**RISKS:**
- Všechna identifikovaná rizika (křehké regexy, obcházení relativními cestami, frozen-lockfile) byla vyřešena a otestována.

**CHANGED FILES:**
- .github/workflows/ci.yml
- package.json
- pnpm-lock.yaml
- tsconfig.json
- packages/boundary-gate/package.json
- packages/boundary-gate/tsconfig.json
- packages/boundary-gate/tsconfig.test.json
- packages/boundary-gate/src/ast-parser.ts
- packages/boundary-gate/src/classifier.ts
- packages/boundary-gate/src/cli.ts
- packages/boundary-gate/src/index.ts
- packages/boundary-gate/src/rules.ts
- packages/boundary-gate/src/scanner.ts
- packages/boundary-gate/src/types.ts
- packages/boundary-gate/tests/boundary-gate.test.ts
- packages/boundary-gate/tests/fixtures/**/*
- docs/worklog/branches/task-TMPR-NEWDEV-20260912-F1-007-boundary-gate.md

**TEST STATUS:** 160/160 PASS, BOUNDARIES_GATE_PASS
**COMMITS:** pending
**PUSH STATUS:** PENDING_COMMIT
**CI STATUS:** PENDING
**LAST VERIFIED HEAD:** ddb79f1092e06c7e3f898fe717c1bf2182bcfb46
**EXACT NEXT STEP:** Git add and commit implementačního balíčku a konfigurace na pracovní větvi
**LAST UPDATED:** 2026-09-12T02:24:00-07:00
