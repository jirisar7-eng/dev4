/**
 * @file scaffold.test.ts
 * @description Komplexní testovací sada pro Standard Module Scaffold Generator (NEWDEV-14 / F1-008).
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  scaffoldModule,
  validateScaffoldOptions,
  normalizeScaffoldMetadata,
  parseCliArgs,
  toPascalCase,
  toCamelCase,
  toHumanName,
} from "../src/scaffold/index.js";
import { validateModuleManifest } from "../src/contract/validator.js";
import { ModuleRegistry } from "../src/registry/registry.js";

describe("Module Scaffold Generator (NEWDEV-14 / F1-008)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tmpr-scaffold-test-"));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignorovat chyby při úklidu v testu
    }
  });

  describe("1. Validace vstupů (validateScaffoldOptions)", () => {
    it("přijme platný namespaced moduleKey", () => {
      assert.doesNotThrow(() => {
        validateScaffoldOptions({ moduleKey: "family.alimony" });
      });
      assert.doesNotThrow(() => {
        validateScaffoldOptions({ moduleKey: "legal.statutes-sync" });
      });
      assert.doesNotThrow(() => {
        validateScaffoldOptions({ moduleKey: "custom.sample-module" });
      });
    });

    it("odmítne chybějící nebo prázdný moduleKey s českou chybovou zprávou", () => {
      assert.throws(
        () => validateScaffoldOptions({ moduleKey: "" }),
        /Klíč modulu \(moduleKey\) je povinný parametr a nesmí být prázdný/
      );
      assert.throws(
        // @ts-expect-error test neplatného typu
        () => validateScaffoldOptions({ moduleKey: null }),
        /Klíč modulu \(moduleKey\) je povinný parametr a nesmí být prázdný/
      );
    });

    it("odmítne nenamespacovaný klíč (bez tečky)", () => {
      assert.throws(
        () => validateScaffoldOptions({ moduleKey: "alimony" }),
        /Neplatný klíč modulu 'alimony'/
      );
    });

    it("odmítne velká písmena nebo podtržítka v moduleKey", () => {
      assert.throws(
        () => validateScaffoldOptions({ moduleKey: "Family.Alimony" }),
        /Neplatný klíč modulu/
      );
      assert.throws(
        () => validateScaffoldOptions({ moduleKey: "family_alimony.core" }),
        /Neplatný klíč modulu/
      );
    });

    it("odmítne neplatný SemVer", () => {
      assert.throws(
        () => validateScaffoldOptions({ moduleKey: "sample.demo", version: "v1.0.0" }),
        /Neplatná verze 'v1.0.0'/
      );
      assert.throws(
        () => validateScaffoldOptions({ moduleKey: "sample.demo", version: "beta-1" }),
        /Neplatná verze 'beta-1'/
      );
    });
  });

  describe("2. Pomocné konverzní funkce", () => {
    it("správně převede na PascalCase", () => {
      assert.equal(toPascalCase("family.alimony"), "FamilyAlimony");
      assert.equal(toPascalCase("legal.statutes-sync"), "LegalStatutesSync");
      assert.equal(toPascalCase("custom.my-sample-mod"), "CustomMySampleMod");
    });

    it("správně převede na camelCase", () => {
      assert.equal(toCamelCase("family.alimony"), "familyAlimony");
      assert.equal(toCamelCase("legal.statutes-sync"), "legalStatutesSync");
    });

    it("správně odvodí lidsky čitelný název", () => {
      assert.equal(toHumanName("family.alimony"), "Family Alimony");
      assert.equal(toHumanName("legal.statutes-sync"), "Legal Statutes Sync");
    });
  });

  describe("3. Normalizace metadat (normalizeScaffoldMetadata)", () => {
    it("doplní výchozí hodnoty podle konvence", () => {
      const meta = normalizeScaffoldMetadata({
        moduleKey: "family.alimony",
        workspaceRoot: tempDir,
      });

      assert.equal(meta.moduleKey, "family.alimony");
      assert.equal(meta.name, "Family Alimony");
      assert.equal(meta.slug, "family-alimony");
      assert.equal(meta.packageName, "@tmpr/family-alimony");
      assert.equal(meta.dbPrefix, "family_alimony");
      assert.equal(meta.version, "0.1.0");
      assert.equal(meta.targetDir, path.join(tempDir, "modules", "family-alimony"));
      assert.equal(meta.overwrite, false);
      assert.equal(meta.dryRun, false);
    });

    it("respektuje explicitní název, popis, verzi a targetDir", () => {
      const customTarget = path.join(tempDir, "custom-location");
      const meta = normalizeScaffoldMetadata({
        moduleKey: "family.alimony",
        name: "Výpočet výživného",
        description: "Matematický výpočetní engine výživného",
        version: "1.2.0",
        targetDir: customTarget,
        overwrite: true,
        dryRun: true,
      });

      assert.equal(meta.name, "Výpočet výživného");
      assert.equal(meta.description, "Matematický výpočetní engine výživného");
      assert.equal(meta.version, "1.2.0");
      assert.equal(meta.targetDir, customTarget);
      assert.equal(meta.overwrite, true);
      assert.equal(meta.dryRun, true);
    });
  });

  describe("4. Generování a struktura modulu (scaffoldModule)", () => {
    it("vygeneruje všech 9 povinných architektonických částí", () => {
      const targetDir = path.join(tempDir, "sample-demo");
      const result = scaffoldModule({
        moduleKey: "sample.demo",
        targetDir,
        workspaceRoot: tempDir,
      });

      assert.ok(result.success);
      assert.equal(result.moduleKey, "sample.demo");
      assert.equal(result.targetDir, targetDir);

      // Kontrola 9 povinných částí:
      // 1. manifest
      assert.ok(fs.existsSync(path.join(targetDir, "src", "manifest.ts")));
      // 2. domain
      assert.ok(fs.existsSync(path.join(targetDir, "src", "domain", "index.ts")));
      assert.ok(fs.existsSync(path.join(targetDir, "src", "domain", "types.ts")));
      assert.ok(fs.existsSync(path.join(targetDir, "src", "domain", "service.ts")));
      // 3. data
      assert.ok(fs.existsSync(path.join(targetDir, "src", "data", "index.ts")));
      assert.ok(fs.existsSync(path.join(targetDir, "src", "data", "repository.ts")));
      // 4. api
      assert.ok(fs.existsSync(path.join(targetDir, "src", "api", "index.ts")));
      assert.ok(fs.existsSync(path.join(targetDir, "src", "api", "handler.ts")));
      // 5. public
      assert.ok(fs.existsSync(path.join(targetDir, "src", "public", "index.ts")));
      // 6. admin
      assert.ok(fs.existsSync(path.join(targetDir, "src", "admin", "index.ts")));
      // 7. help
      assert.ok(fs.existsSync(path.join(targetDir, "help", "cs", "index.md")));
      // 8. tests
      assert.ok(fs.existsSync(path.join(targetDir, "tests", "index.test.ts")));
      // 9. migrations a schema
      assert.ok(fs.existsSync(path.join(targetDir, "database", "schema", "schema.prisma")));
      assert.ok(fs.existsSync(path.join(targetDir, "database", "migrations", "0001_initial", "migration.sql")));

      // Doplňkové konfigurační soubory
      assert.ok(fs.existsSync(path.join(targetDir, "package.json")));
      assert.ok(fs.existsSync(path.join(targetDir, "tsconfig.json")));
      assert.ok(fs.existsSync(path.join(targetDir, "src", "contract.ts")));
      assert.ok(fs.existsSync(path.join(targetDir, "src", "index.ts")));
    });

    it("vygenerovaný manifest je 100% validní vůči ModuleManifestSchema", () => {
      const targetDir = path.join(tempDir, "family-alimony");
      const result = scaffoldModule({
        moduleKey: "family.alimony",
        targetDir,
        workspaceRoot: tempDir,
      });

      const parsed = validateModuleManifest(result.manifest);
      assert.equal(parsed.moduleKey, "family.alimony");
      assert.equal(parsed.surfaces.api.basePath, "/api/v1/family-alimony");
      assert.equal(parsed.dataOwnership.schemaPath, "database/schema/schema.prisma");
      assert.equal(parsed.dataOwnership.migrationsPath, "database/migrations");
    });

    it("vygenerovaný manifest se úspěšně registruje do ModuleRegistry", () => {
      const targetDir = path.join(tempDir, "legal-parser");
      const result = scaffoldModule({
        moduleKey: "legal.judgment-parser",
        targetDir,
        workspaceRoot: tempDir,
      });

      const registry = new ModuleRegistry({ synthesisCoreVersion: "0.1.0" });
      assert.doesNotThrow(() => {
        registry.register({ manifest: result.manifest });
      });

      const record = registry.getRecord("legal.judgment-parser");
      assert.ok(record);
      assert.equal(record?.manifest.name, "Legal Judgment Parser");
      assert.equal(record?.state, "uninstalled");
    });

    it("package.json obsahuje subpath export './contract' pro zapouzdření (ERR-ARCH-005)", () => {
      const targetDir = path.join(tempDir, "contract-check");
      scaffoldModule({
        moduleKey: "sample.contract-test",
        targetDir,
        workspaceRoot: tempDir,
      });

      const pkgRaw = fs.readFileSync(path.join(targetDir, "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw);

      assert.equal(pkg.name, "@tmpr/sample-contract-test");
      assert.ok(pkg.exports["."]);
      assert.ok(pkg.exports["./contract"], "Chybí povinný subpath export ./contract");
      assert.equal(pkg.exports["./contract"].import, "./dist/contract.js");
    });
  });

  describe("5. Bezpečné odmítnutí kolize a overwrite", () => {
    it("bezpečně odmítne existující neprázdný cílový adresář bez overwrite", () => {
      const targetDir = path.join(tempDir, "collision-target");
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, "existing.txt"), "important data");

      assert.throws(
        () =>
          scaffoldModule({
            moduleKey: "sample.collision",
            targetDir,
            workspaceRoot: tempDir,
            overwrite: false,
          }),
        /Cílový adresář .* již existuje a není prázdný\. Použijte parametr '--overwrite'/
      );
    });

    it("úspěšně přepíše existující adresář, pokud je overwrite = true", () => {
      const targetDir = path.join(tempDir, "overwrite-target");
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, "dummy.txt"), "old");

      const result = scaffoldModule({
        moduleKey: "sample.overwrite",
        targetDir,
        workspaceRoot: tempDir,
        overwrite: true,
      });

      assert.ok(result.success);
      assert.ok(fs.existsSync(path.join(targetDir, "src", "manifest.ts")));
    });
  });

  describe("6. Deterministický výstup a dry-run", () => {
    it("dry-run vrátí seznam plánovaných souborů a nezapíše na disk", () => {
      const targetDir = path.join(tempDir, "dryrun-target");
      const result = scaffoldModule({
        moduleKey: "sample.dryrun",
        targetDir,
        workspaceRoot: tempDir,
        dryRun: true,
      });

      assert.ok(result.success);
      assert.ok(result.dryRun);
      assert.equal(result.files.length, 19);
      assert.ok(!fs.existsSync(targetDir), "Při dryRun nesmí být vytvořen cílový adresář");
    });

    it("dvě po sobě jdoucí volání se stejnými vstupy vytvoří identický obsah (determinizmus)", () => {
      const targetDir1 = path.join(tempDir, "det-1");
      const targetDir2 = path.join(tempDir, "det-2");

      const res1 = scaffoldModule({
        moduleKey: "sample.deterministic",
        targetDir: targetDir1,
        workspaceRoot: tempDir,
      });

      const res2 = scaffoldModule({
        moduleKey: "sample.deterministic",
        targetDir: targetDir2,
        workspaceRoot: tempDir,
      });

      assert.equal(res1.files.length, res2.files.length);

      for (let i = 0; i < res1.files.length; i++) {
        const f1 = res1.files[i]!;
        const f2 = res2.files[i]!;
        assert.equal(f1.relativePath, f2.relativePath);
        assert.equal(
          f1.content,
          f2.content,
          `Neshoda v obsahu souboru ${f1.relativePath}`
        );
      }
    });
  });

  describe("7. Brand Neutrality a Boundary Compliance", () => {
    it("vygenerovaný kód neobsahuje žádný projektový brand ani zakázané balíčky", () => {
      const targetDir = path.join(tempDir, "neutral-check");
      const result = scaffoldModule({
        moduleKey: "sample.neutral",
        targetDir,
        workspaceRoot: tempDir,
      });

      const forbiddenBrandTerms = [
        "tata-ma-pravo",
        "Táta má právo",
        "tatovacesta",
        "#1e40af",
      ];
      const forbiddenPackages = ["bullmq", "ioredis", "redis"];

      for (const file of result.files) {
        for (const term of forbiddenBrandTerms) {
          assert.ok(
            !file.content.includes(term),
            `Soubor ${file.relativePath} obsahuje zakázaný projektový brand '${term}'`
          );
        }
        for (const pkg of forbiddenPackages) {
          assert.ok(
            !file.content.includes(`"${pkg}"`) && !file.content.includes(`'${pkg}'`),
            `Soubor ${file.relativePath} obsahuje zakázaný balíček '${pkg}'`
          );
        }
      }
    });
  });

  describe("8. CLI argument parser (parseCliArgs)", () => {
    it("správně parsuje standardní flagy", () => {
      const parsed = parseCliArgs([
        "--moduleKey",
        "family.alimony",
        "--name",
        "Family Alimony",
        "--description",
        "Engine výpočtu výživného",
        "--version",
        "0.2.0",
        "--overwrite",
        "--dryRun",
      ]);

      assert.ok(parsed.options);
      assert.equal(parsed.options.moduleKey, "family.alimony");
      assert.equal(parsed.options.name, "Family Alimony");
      assert.equal(parsed.options.description, "Engine výpočtu výživného");
      assert.equal(parsed.options.version, "0.2.0");
      assert.equal(parsed.options.overwrite, true);
      assert.equal(parsed.options.dryRun, true);
    });

    it("správně parsuje zkrácené flagy (-k, -n, -d, -v, -f)", () => {
      const parsed = parseCliArgs([
        "-k",
        "custom.short-flags",
        "-n",
        "Short",
        "-d",
        "Desc",
        "-v",
        "1.0.0",
        "-f",
      ]);

      assert.ok(parsed.options);
      assert.equal(parsed.options.moduleKey, "custom.short-flags");
      assert.equal(parsed.options.name, "Short");
      assert.equal(parsed.options.description, "Desc");
      assert.equal(parsed.options.version, "1.0.0");
      assert.equal(parsed.options.overwrite, true);
    });

    it("správně parsuje syntaxi --key=value", () => {
      const parsed = parseCliArgs([
        "--moduleKey=sample.equals-syntax",
        "--name=Equals Test",
        "--json",
      ]);

      assert.ok(parsed.options);
      assert.equal(parsed.options.moduleKey, "sample.equals-syntax");
      assert.equal(parsed.options.name, "Equals Test");
      assert.equal(parsed.jsonOutput, true);
    });

    it("detekuje chybějící povinný parametr --moduleKey", () => {
      const parsed = parseCliArgs(["--name", "Missing Key"]);
      assert.ok(parsed.error);
      assert.match(parsed.error, /Chybí povinný parametr '--moduleKey/);
    });

    it("detekuje požadavek na --help", () => {
      const parsed = parseCliArgs(["--help"]);
      assert.equal(parsed.showHelp, true);

      const parsedShort = parseCliArgs(["-h"]);
      assert.equal(parsedShort.showHelp, true);
    });

    it("detekuje neznámý parametr", () => {
      const parsed = parseCliArgs(["-k", "sample.demo", "--unknown-flag"]);
      assert.ok(parsed.error);
      assert.match(parsed.error, /Neznámý parametr: --unknown-flag/);
    });
  });
});
