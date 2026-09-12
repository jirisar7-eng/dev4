# BRANCH WORKLOG: task/TMPR-NEWDEV-20260912-F1-008-module-scaffold

**TASK ID:** TMPR-NEWDEV-20260912-F1-008  
**BACKLOG:** NEWDEV-14  
**PHASE:** F1 — Kontrakty  
**PURPOSE:** Standard Module Scaffold Generator — deterministický CLI a programatický generátor standardního doménového modulu podle aktuálního Module Contractu.  
**WHY:** Zajištění jednotné, bezpečné a architektonicky vyhovující struktury všech doménových modulů (manifest, domain, data, api, public, admin, help, tests, migrations) bez manuální chybovosti, bez úniku brandu a s plnou kompatibilitou vůči validatoru, registru a boundary-gate.  
**BASE BRANCH:** main  
**BASE COMMIT:** 481140a28f8f985217ba842ce95d1bf2bac5b1e2  
**WORK BRANCH:** task/TMPR-NEWDEV-20260912-F1-008-module-scaffold  
**STATUS:** LOCAL_PASS  

## IN SCOPE:
- Deterministický generátor doménového modulu v `@tmpr/module-engine` (`packages/module-engine/src/scaffold/`)
- CLI rozhraní s podporou parametrů `--moduleKey`, `--name`, `--description`, `--version`, `--targetDir`, `--overwrite`, `--dryRun`, `--json`, `-h/--help`
- Kořenový npm skript `pnpm scaffold:module` a CLI bin `tmpr-scaffold` v `@tmpr/module-engine`
- Kompletní 9-dílná standardní struktura generovaného modulu:
  - `manifest.ts` plně validní dle Zod schématu `ModuleManifestSchema` a integrovatelný do `ModuleRegistry`
  - `contract.ts` — veřejný kontrakt pro `./contract` subpath export
  - `index.ts` — hlavní export modulu
  - `domain/` (`types.ts`, `service.ts`, `index.ts`) — čistá doménová logika a invarianty
  - `data/` (`repository.ts`, `index.ts`) — decentralizované datové vlastnictví a repozitář
  - `api/` (`handler.ts`, `index.ts`) — API handler fasády
  - `public/` (`index.ts`) — veřejné UI rozhraní / view-model
  - `admin/` (`index.ts`) — administrátorská konfigurace navigace a RBAC oprávnění
  - `help/` (`help/cs/index.md`) — lokalizovaný help pack
  - `tests/` (`index.test.ts`, `tsconfig.test.json`) — plně spustitelné unit testy
  - `database/schema/schema.prisma` a `database/migrations/0001_initial/migration.sql` — vlastní schéma a SQL migrace
  - `package.json` a `tsconfig.json` pro monorepo integraci
- Bezpečnost a validace:
  - Striktní validace `moduleKey` přes `NAMESPACED_MODULE_KEY_REGEX` (tečková notace, malá písmena)
  - Bezpečné odmítnutí existujícího neprázdného cílového adresáře bez explicitního `--overwrite`
  - Deterministický výstup (opakované spuštění se shodným vstupem generuje identické soubory)
  - Brand neutrality: nulový výskyt projektových značek ("tata-ma-pravo", "Táta má právo", "tatovacesta", "#1e40af") a zakázaných balíčků ("bullmq", "redis", "ioredis")
  - Zákaz cross-module internals: striktní subpath `./contract`
- Automatické testy:
  - `packages/module-engine/tests/scaffold.test.ts` (19 testů pokrývajících validaci vstupů, transformace, generování 9 částí, validaci manifestu, registraci do registru, kolize, overwrite, dry-run, determinismus, brand neutrality a CLI parser)
  - Celkem 165 testů v `@tmpr/module-engine` (100% PASS)
  - Ověření přes `pnpm test:boundaries` (0 chyb jak v samotném repozitáři, tak při testovacím scaffolding modulu)

## OUT OF SCOPE:
- Implementace dynamické lifecycle logiky modulu (NEWDEV-16)

## ZMĚNĚNÉ A PŘIDANÉ SOUBORY:
- `packages/module-engine/src/scaffold/types.ts` — typy voleb, metadat a generovaných souborů
- `packages/module-engine/src/scaffold/templates.ts` — deterministické šablony pro všech 19 souborů standardního modulu
- `packages/module-engine/src/scaffold/generator.ts` — validační, kolizní a generovací jádro `scaffoldModule`
- `packages/module-engine/src/scaffold/cli.ts` — CLI rozhraní s podporou argumentů, nápovědy a JSON výstupu
- `packages/module-engine/src/scaffold/index.ts` — barrel export subsystému scaffold
- `packages/module-engine/src/index.ts` — export scaffold API
- `packages/module-engine/package.json` — přidán bin `tmpr-scaffold`, export `./scaffold` a aktualizován glob pro spouštění testů
- `packages/module-engine/tests/scaffold.test.ts` — komplexní testovací sada
- `package.json` — přidán skript `scaffold:module`

## VÝSLEDKY VERIFIKACE:
- `pnpm turbo run build`: PASS (2/2 balíčky)
- `pnpm turbo run typecheck`: PASS (2/2 balíčky)
- `pnpm turbo run test`: PASS (165 testů v module-engine, 21 testů v boundary-gate, 0 selhání)
- `pnpm turbo run lint`: PASS (2/2 balíčky)
- `pnpm test:boundaries`: PASS (0 porušení, 38 souborů, 120 importů)
- `pnpm scaffold:module --moduleKey family.alimony` + `test:boundaries`: PASS (0 porušení, 51 souborů, 141 importů)
- `pnpm --filter family-alimony test`: PASS (4 testy, 100% PASS)
