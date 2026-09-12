# BRANCH WORKLOG: task/TMPR-NEWDEV-20260912-F1-009-module-lifecycle

**TASK ID:** TMPR-NEWDEV-20260912-F1-009  
**BACKLOG:** NEWDEV-16  
**PHASE:** F1 — Kontrakty  
**PURPOSE:** Reference Module Lifecycle Gate — implementace a ověření reusable lifecycle orchestration v Module Engine na referenčním modulu vytvořeném scaffold generátorem.  
**WHY:** Zajištění robustního, deterministického a fail-closed řízení životního cyklu modulů (uninstalled -> installed -> enabled -> disabled -> enabled -> uninstall -> uninstalled) včetně spouštění existujících hooků, správy závislostí a úklidu rout, oprávnění a datových artefaktů bez obcházení autoritativního registru.  
**BASE BRANCH:** main  
**BASE COMMIT:** 3932eb9e6d0e98cb2be3fe82a8d94332635d710b  
**WORK BRANCH:** task/TMPR-NEWDEV-20260912-F1-009-module-lifecycle  
**STATUS:** IN_PROGRESS  

## IN SCOPE:
- Reusable lifecycle orchestration engine (`ModuleLifecycleEngine`) v `@tmpr/module-engine/lifecycle`
- Povinný přechodový diagram stavového automatu:
  `uninstalled` → `install` → `installed` → `enable` → `enabled` → `disable` → `disabled` → `enable` → `enabled` → `uninstall` → `uninstalled`
- Použití existujících `IModule` lifecycle hooků (`onInstall`, `onEnable`, `onDisable`, `onUninstall`), `ModuleRegistry`, `DependencyResolver` a `ModuleGate`
- Zajištění autoritativního stavu v `ModuleRegistry` bez přímého obcházení přes `recordState` z aplikačního kódu
- Neplatný přechod = fail-closed (`INVALID_TRANSITION`)
- Hook failure nesmí zanechat falešný úspěšný stav (nastavení stavu `failed`, propagace chyby)
- Ověření úklidu rout/surfaces, oprávnění a referenčních datových/migračních artefaktů
- Ověření, že disabled/uninstalled/failed modul není dostupný přes Module Gate
- Respektování povinných závislostí (`DEPENDENCY_BLOCKED`, `REQUIRED_DEPENDENCY_NOT_ENABLED`, `DEPENDENT_MODULES_ACTIVE`)
- Reference module vytvořený přes scaffold generátor (`scaffoldModule`)
- Brand neutrality — žádný projektový brand ani user-visible text natvrdo
- Reusable engine — žádný test-only mock
- Komplexní testovací sada pro všechny stavy, přechody, hook failures a dependency blockers

## OUT OF SCOPE:
- Implementace produkčních databázových migrací přes Prisma CLI
- Implementace dalších doménových modulů (F2)
- Změna runtime deploymentu v DEV3/PROD4
- Úpravy v balíčcích mimo `@tmpr/module-engine` kromě exportů a testů

## PLANNED VERIFICATION:
- `pnpm -C packages/module-engine test`
- `pnpm test` (celé monorepo přes Turborepo)
- `@tmpr/boundary-gate` (architektonické brány a ERR-ARCH pravidla)
- `pnpm -C packages/module-engine build`
- `pnpm -C packages/module-engine typecheck`

## HISTORY:
- **2026-09-12**: Recovered from QUOTA EXCEEDED (R02). All tests pass. Creating CHECKPOINT commit.
