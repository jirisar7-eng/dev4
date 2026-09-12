/**
 * @file boundary-gate.test.ts
 * @description Povinná testovací sada pro kontrolu architektonických hranic DEV4.
 *
 * POVINNÉ TESTY DLE ZADÁNÍ:
 * 1. povolený downward import PASS
 * 2. OS → Project FAIL
 * 3. OS → Domain FAIL
 * 4. CMS → Project FAIL
 * 5. CMS → Domain FAIL
 * 6. module A → internals module B FAIL
 * 7. veřejný contract import PASS
 * 8. relative import nesmí pravidlo obejít
 * 9. re-export/dynamic import nesmí pravidlo obejít
 * 10. současný DEV4 musí celý PASS
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validateSourceCode, scanWorkspace } from "../src/scanner.js";

function findWorkspaceRoot(startDir: string): string {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(startDir, "../../../..");
}

describe("Architecture Boundary Gate Tests (NEWDEV-15)", () => {
  // Test 1: povolený downward import PASS
  describe("Test 1: Povolený downward import (PASS)", () => {
    it("Domain Module smí importovat CMS, Synthesis OS a UI", () => {
      const code = `
        import { CoreAuth } from "@tmpr/synthesis-core";
        import { CmsArticle } from "@tmpr/synthesis-cms";
        import { Button } from "@tmpr/ui";
      `;
      const result = validateSourceCode(
        code,
        "modules/family-alimony/src/calc.ts"
      );
      assert.equal(result.violations.length, 0);
      assert.equal(result.importsCount, 3);
    });

    it("Project Package smí importovat Synthesis CMS a Synthesis OS", () => {
      const code = `
        import { CoreEngine } from "@tmpr/synthesis-core";
        import { CmsEngine } from "@tmpr/synthesis-cms";
      `;
      const result = validateSourceCode(
        code,
        "packages/project-tata-ma-pravo/src/index.ts"
      );
      assert.equal(result.violations.length, 0);
    });

    it("Synthesis CMS smí importovat Synthesis OS", () => {
      const code = `
        import { CoreEngine } from "@tmpr/synthesis-core";
        import { BaseComponent } from "@tmpr/ui";
      `;
      const result = validateSourceCode(
        code,
        "packages/synthesis-cms/src/index.ts"
      );
      assert.equal(result.violations.length, 0);
    });
  });

  // Test 2: OS → Project FAIL
  describe("Test 2: OS → Project (FAIL)", () => {
    it("Synthesis Core nesmí importovat Project Package", () => {
      const code = `import { ProjectConfig } from "@tmpr/project-tata-ma-pravo";`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-core/src/index.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-001");
      assert.equal(v.source.layer, "synthesis-os");
      assert.equal(v.target.targetLayer, "project");
    });
  });

  // Test 3: OS → Domain FAIL
  describe("Test 3: OS → Domain (FAIL)", () => {
    it("Module Engine nesmí importovat Domain Modul", () => {
      const code = `import { AlimonyModule } from "@tmpr/family-alimony";`;
      const result = validateSourceCode(
        code,
        "packages/module-engine/src/loader.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-003");
      assert.equal(v.source.layer, "synthesis-os");
      assert.equal(v.target.targetLayer, "domain-module");
    });
  });

  // Test 4: CMS → Project FAIL
  describe("Test 4: CMS → Project (FAIL)", () => {
    it("Synthesis CMS nesmí importovat Project Package", () => {
      const code = `import { projectTheme } from "@tmpr/project-tata-ma-pravo";`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-cms/src/theme.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-002");
      assert.equal(v.source.layer, "synthesis-cms");
      assert.equal(v.target.targetLayer, "project");
    });
  });

  // Test 5: CMS → Domain FAIL
  describe("Test 5: CMS → Domain (FAIL)", () => {
    it("Synthesis CMS nesmí importovat doménový modul", () => {
      const code = `import { ChildCareService } from "@tmpr/family-child-care";`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-cms/src/service.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-002");
      assert.equal(v.source.layer, "synthesis-cms");
      assert.equal(v.target.targetLayer, "domain-module");
    });
  });

  // Test 6: module A → internals module B FAIL
  describe("Test 6: module A → internals module B (FAIL)", () => {
    it("Modul nesmí importovat interní implementaci jiného modulu", () => {
      const code = `import { internalDb } from "@tmpr/institutions-registry/src/internal/db";`;
      const result = validateSourceCode(
        code,
        "modules/family-alimony/src/calc.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-005");
      assert.match(v.message, /zapouzdření modulu/);
    });

    it("Modul smí importovat své vlastní interní soubory", () => {
      const code = `import { helper } from "./internal/helper.js";`;
      const result = validateSourceCode(
        code,
        "modules/family-alimony/src/calc.ts"
      );
      assert.equal(result.violations.length, 0);
    });
  });

  // Test 7: veřejný contract import PASS
  describe("Test 7: Veřejný contract import mezi moduly (PASS)", () => {
    it("Modul A smí importovat veřejný kontrakt modulu B přes @tmpr/<modul>/contract", () => {
      const code = `import type { InstitutionContract } from "@tmpr/institutions-registry/contract";`;
      const result = validateSourceCode(
        code,
        "modules/family-alimony/src/calc.ts"
      );
      assert.equal(result.violations.length, 0);
    });
  });

  // Test 8: relative import nesmí pravidlo obejít
  describe("Test 8: Relative import nesmí pravidlo obejít", () => {
    it("Relativní import z OS do Domain Modulu musí být detekován a zamítnut", () => {
      const code = `import { AlimonyCalc } from "../../../modules/family-alimony/src/contract";`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-core/src/index.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-001");
      assert.equal(v.target.isRelative, true);
      assert.equal(v.target.targetLayer, "domain-module");
    });

    it("Relativní import z OS do Project balíčku musí být detekován a zamítnut", () => {
      const code = `import { projectSettings } from "../../project-tata-ma-pravo/src/index";`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-core/src/index.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-001");
      assert.equal(v.target.isRelative, true);
      assert.equal(v.target.targetLayer, "project");
    });
  });

  // Test 9: re-export / dynamic import nesmí pravidlo obejít
  describe("Test 9: Re-export a dynamic import nesmějí pravidlo obejít", () => {
    it("Re-export zakázaného balíčku z OS je detekován", () => {
      const code = `export * from "@tmpr/project-tata-ma-pravo";`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-core/src/index.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-001");
      assert.equal(v.importType, "re-export");
    });

    it("Dynamický import zakázaného balíčku z OS je detekován", () => {
      const code = `
        export async function load() {
          const p = await import("@tmpr/project-tata-ma-pravo");
          return p;
        }
      `;
      const result = validateSourceCode(
        code,
        "packages/synthesis-core/src/index.ts"
      );
      assert.equal(result.violations.length, 1);
      const v = result.violations[0]!;
      assert.equal(v.ruleId, "ERR-ARCH-001");
      assert.equal(v.importType, "dynamic-import");
    });

    it("CommonJS require zakázaného balíčku je detekován", () => {
      const code = `const p = require("@tmpr/project-tata-ma-pravo");`;
      const result = validateSourceCode(
        code,
        "packages/synthesis-core/src/index.ts"
      );
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0]!.importType, "require");
    });
  });

  // Doplňková pravidla: Brand leakage, Client DB access, Forbidden Redis
  describe("Doplňková pravidla (ERR-ARCH-004, ERR-ARCH-007, ERR-ARCH-008)", () => {
    it("ERR-ARCH-004: Neutrální administrace nesmí importovat brand", () => {
      const code = `import { logo } from "@tmpr/project-tata-ma-pravo/brand";`;
      const result = validateSourceCode(
        code,
        "apps/admin/src/header.tsx"
      );
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0]!.ruleId, "ERR-ARCH-004");
    });

    it("ERR-ARCH-004: Neutrální OS balíček nesmí importovat brand", () => {
      const code = `import { logo } from "@tmpr/project-tata-ma-pravo/brand";`;
      const result = validateSourceCode(
        code,
        "packages/ui/src/button.tsx"
      );
      assert.ok(result.violations.some((v) => v.ruleId === "ERR-ARCH-004"));
    });

    it("ERR-ARCH-007: Klientská aplikace nesmí přímo importovat Prisma", () => {
      const code = `import { PrismaClient } from "@prisma/client";`;
      const result = validateSourceCode(
        code,
        "apps/public/src/app/page.tsx"
      );
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0]!.ruleId, "ERR-ARCH-007");
    });

    it("ERR-ARCH-008: Zakázaný balíček bullmq a ioredis", () => {
      const code = `
        import { Queue } from "bullmq";
        import Redis from "ioredis";
      `;
      const result = validateSourceCode(
        code,
        "apps/worker/src/index.ts"
      );
      assert.equal(result.violations.length, 2);
      assert.equal(result.violations[0]!.ruleId, "ERR-ARCH-008");
      assert.equal(result.violations[1]!.ruleId, "ERR-ARCH-008");
    });
  });

  // Test 10: současný DEV4 musí celý PASS

  describe("Test 11: ERR-ARCH-009 Module Engine Internal Mutation", () => {
    it("Zakazuje package import `@tmpr/module-engine/registry/registry.internal` mimo module-engine", () => {
      const code = `import { registryMutators } from "@tmpr/module-engine/registry/registry.internal.js";`;
      const result = validateSourceCode(code, "packages/synthesis-cms/src/loader.ts");
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0]!.ruleId, "ERR-ARCH-009");
    });

    it("Zakazuje relative import z domain modulu", () => {
      const code = `import { internal } from "../../../../packages/module-engine/src/registry/registry.internal";`;
      const result = validateSourceCode(code, "modules/family-alimony/src/calc.ts");
      assert.equal(result.violations.length, 1);
      assert.equal(result.violations[0]!.ruleId, "ERR-ARCH-009");
    });

    it("Povoluje internal import UVNITŘ module-engine", () => {
      const code = `import { registryMutators } from "../registry/registry.internal.js";`;
      const result = validateSourceCode(code, "packages/module-engine/src/lifecycle/lifecycle.engine.ts");
      // ERR-ARCH-009 by se nemělo triggerovat (výsledek bude 0 violations, protože OS-level import vlastních věcí je povolen)
      assert.equal(result.violations.length, 0);
    });
  });

  describe("Test 10: Současný DEV4 workspace musí celý PASS", () => {
    it("Kompletní scan existujících packages/*, modules/*, apps/* v DEV4 má 0 porušení", () => {
      const workspaceRoot = findWorkspaceRoot(import.meta.dirname);
      const result = scanWorkspace(workspaceRoot, { excludeFixtures: true });

      assert.equal(
        result.success,
        true,
        `DEV4 workspace selhal na boundary gate:\n${result.formattedReport}`
      );
      assert.equal(result.violations.length, 0);
      assert.ok(
        result.scannedFilesCount > 0,
        `Mělo být zkontrolováno více než 0 souborů (nalezeno: ${result.scannedFilesCount})`
      );
    });
  });
});
