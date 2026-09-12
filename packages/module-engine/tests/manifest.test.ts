/**
 * @tmpr/module-engine - Mandatory Manifest Contract Tests
 * Povinné testy schématu a validátoru manifestu modulu dle TMPR-NEWDEV-20260911-F1-002 & R02
 * a české validační diagnostiky dle TMPR-NEWDEV-20260912-F1-006.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  validateModuleManifest,
  safeValidateModuleManifest,
  formatManifestValidationIssueCs
} from "../src/contract/validator.js";
import { ModuleRegistry } from "../src/registry/registry.js";
import { ModuleRegistryError } from "../src/registry/registry.errors.js";
import type { IModule } from "../src/contract/types.js";

interface TestDependency { moduleKey: string; versionRange: string; reason?: string; }
interface TestConflict { moduleKey: string; reason: string; }

const createValidManifest = () => ({
  moduleKey: "family.alimony",
  name: "Alimony Calculator",
  description: "Výpočetní engine výživného dle tabulek MS ČR",
  version: "1.0.0",
  compatibility: {
    synthesisCore: "^1.0.0",
    synthesisCms: "^1.0.0"
  },
  dependencies: {
    required: [
      { moduleKey: "institutions.registry", versionRange: "^1.0.0" }
    ] as TestDependency[],
    optional: [
      { moduleKey: "support.communication", versionRange: "^1.0.0", reason: "BIFF validace" }
    ] as TestDependency[],
    conflicts: [] as TestConflict[]
  },
  lifecycle: {
    supportedHooks: ["enable", "disable"],
    requiresRestart: false,
    disableBehavior: {
      mode: "fail_closed",
      fallbackMessage: "Modul výživného je dočasně nedostupný",
      dataRetention: "retain"
    }
  },
  surfaces: {
    api: {
      enabled: true,
      basePath: "/api/alimony",
      surfaces: ["synapi_public", "synapi_private"]
    },
    ui: {
      public: { enabled: true, routePrefix: "/kalkulacka-vyzivneho" },
      account: { enabled: true, routePrefix: "/spis/vyzivne" },
      admin: { enabled: true, routePrefix: "/admin/modules/alimony" }
    }
  },
  routes: [
    { path: "/kalkulacka-vyzivneho", surface: "public", requiresAuth: false },
    { path: "/spis/vyzivne", surface: "account", requiresAuth: true, permission: "alimony.calculate" }
  ],
  permissions: [
    { key: "alimony.calculate", name: "Počítat výživné", description: "Oprávnění k výpočtu", defaultRoles: ["parent", "volunteer"] }
  ],
  capabilities: ["alimony.calculator"],
  dataOwnership: {
    tables: ["alimony_calculations", "alimony_tables_lookup"],
    schemaPath: "database/schema/schema.prisma",
    migrationsPath: "database/migrations",
    isolatedData: true
  },
  events: {
    emits: ["alimony.calculated"],
    subscribes: []
  },
  jobs: [
    {
      jobKey: "alimony-table-sync",
      description: "Pravidelná kontrola tabulek výživného",
      schedule: "0 0 1 * *",
      queueType: "postgres_queue",
      retryLimit: 3
    }
  ],
  cms: {
    contentPacks: [{ packKey: "alimony-guides", path: "content/guides" }],
    textKeys: ["alimony.intro", "alimony.disclaimer"],
    help: { cs: { enabled: true, path: "help/cs" } }
  },
  healthCheck: {
    enabled: true,
    intervalSeconds: 60,
    endpoint: "/health"
  },
  fallback: {
    enabled: true,
    defaultResponse: "Kalkulačka je v údržbě"
  }
});

describe("TMPR-NEWDEV-20260911-F1-002: Module Manifest Schema & Validator", () => {
  it("TEST 1: Validní manifest projde bez chyb", () => {
    const raw = createValidManifest();
    const result = safeValidateModuleManifest(raw);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.moduleKey, "family.alimony");
      assert.equal(result.data.version, "1.0.0");
      assert.equal(result.data.dataOwnership.tables.length, 2);
    }
  });

  it("TEST 2: Chybějící povinné pole selže", () => {
    const rawWithoutKey = createValidManifest();
    delete (rawWithoutKey as any).moduleKey;
    assert.throws(() => validateModuleManifest(rawWithoutKey), /moduleKey/);

    const rawWithoutVersion = createValidManifest();
    delete (rawWithoutVersion as any).version;
    assert.throws(() => validateModuleManifest(rawWithoutVersion), /version/);

    const rawWithoutCompat = createValidManifest();
    delete (rawWithoutCompat as any).compatibility;
    assert.throws(() => validateModuleManifest(rawWithoutCompat), /compatibility/);
  });

  it("TEST 3: Striktní SemVer validace verze modulu", () => {
    // Validní SemVer verze
    const validVersions = [
      "1.0.0",
      "1.2.3-beta.1",
      "1.2.3+build.5",
      "1.2.3-beta.1+build.5"
    ];
    for (const v of validVersions) {
      const raw = createValidManifest();
      raw.version = v;
      const res = safeValidateModuleManifest(raw);
      assert.equal(res.success, true, `Version '${v}' should be accepted as valid SemVer`);
    }

    // Neplatné verze (odmítnutí v1.0.0, 1.0, 1, 01.0.0, not-semver)
    const invalidVersions = ["v1.0.0", "1.0", "1", "01.0.0", "not-semver"];
    for (const v of invalidVersions) {
      const raw = createValidManifest();
      raw.version = v;
      const res = safeValidateModuleManifest(raw);
      assert.equal(res.success, false, `Version '${v}' should be rejected as invalid SemVer`);
    }
  });

  it("TEST 4: Self-dependency selže (v required i optional)", () => {
    // Required self-dependency
    const rawSelfReq = createValidManifest();
    rawSelfReq.dependencies.required.push({
      moduleKey: "family.alimony",
      versionRange: "^1.0.0"
    });
    const resReq = safeValidateModuleManifest(rawSelfReq);
    assert.equal(resReq.success, false);
    assert.ok(
      resReq.errors.some((err) =>
        err.includes("nemůže záviset sám na sobě v povinných závislostech (required)")
      )
    );

    // Optional self-dependency
    const rawSelfOpt = createValidManifest();
    rawSelfOpt.dependencies.optional.push({
      moduleKey: "family.alimony",
      versionRange: "^1.0.0"
    });
    const resOpt = safeValidateModuleManifest(rawSelfOpt);
    assert.equal(resOpt.success, false);
    assert.ok(
      resOpt.errors.some((err) =>
        err.includes("nemůže záviset sám na sobě ve volitelných závislostech (optional)")
      )
    );
  });

  it("TEST 5: Conflict se sebou samým selže", () => {
    const raw = createValidManifest();
    raw.dependencies.conflicts.push({
      moduleKey: "family.alimony",
      reason: "Konflikt se sebou"
    });
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("nemůže deklarovat konflikt sám se sebou")
      )
    );
  });

  it("TEST 6: Duplicitní dependency selže (v required i optional)", () => {
    // Duplicita v required
    const rawReqDup = createValidManifest();
    rawReqDup.dependencies.required = [
      { moduleKey: "institutions.registry", versionRange: "^1.0.0" },
      { moduleKey: "institutions.registry", versionRange: "^2.0.0" }
    ];
    const resReq = safeValidateModuleManifest(rawReqDup);
    assert.equal(resReq.success, false);
    assert.ok(
      resReq.errors.some((err) =>
        err.includes("Duplicitní závislost 'institutions.registry' v povinných závislostech (required)")
      )
    );

    // Duplicita v optional
    const rawOptDup = createValidManifest();
    rawOptDup.dependencies.optional = [
      { moduleKey: "support.communication", versionRange: "^1.0.0" },
      { moduleKey: "support.communication", versionRange: "^1.1.0" }
    ];
    const resOpt = safeValidateModuleManifest(rawOptDup);
    assert.equal(resOpt.success, false);
    assert.ok(
      resOpt.errors.some((err) =>
        err.includes("Duplicitní závislost 'support.communication' ve volitelných závislostech (optional)")
      )
    );
  });

  it("TEST 7: Required + Optional duplicita selže", () => {
    const raw = createValidManifest();
    raw.dependencies.required = [
      { moduleKey: "common.module", versionRange: "^1.0.0" }
    ];
    raw.dependencies.optional = [
      { moduleKey: "common.module", versionRange: "^1.0.0" }
    ];
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("nemůže být současně povinná (required) i volitelná (optional)")
      )
    );
  });

  it("TEST 8: Neznámá surface selže", () => {
    const raw = createValidManifest();
    (raw.surfaces.ui as any).partnerPortal = { enabled: true };
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("Zadána neznámá UI surface") || err.includes("Nerozpoznané klíče")
      )
    );
  });

  it("TEST 9: Namespaced moduleKey validace (PASS & FAIL)", () => {
    // PASS cases:
    const passKeys = [
      "platform.module-engine",
      "family.alimony",
      "family.child-care",
      "module.reference"
    ];
    for (const k of passKeys) {
      const raw = createValidManifest();
      raw.moduleKey = k;
      const res = safeValidateModuleManifest(raw);
      assert.equal(res.success, true, `moduleKey '${k}' should pass validation`);
    }

    // FAIL cases:
    const failKeys = [
      "family-alimony",
      "Family.alimony",
      "family_alimony",
      ".family",
      "family.",
      "family..alimony"
    ];
    for (const k of failKeys) {
      const raw = createValidManifest();
      raw.moduleKey = k;
      const res = safeValidateModuleManifest(raw);
      assert.equal(res.success, false, `moduleKey '${k}' should fail validation`);
    }
  });

  it("TEST 10: SemVer range validace (dependencies & compatibility)", () => {
    // PASS ranges:
    const passRanges = ["*", "^1.0.0", "~1.2.0", ">=1.0.0 <2.0.0"];
    for (const r of passRanges) {
      const raw = createValidManifest();
      raw.dependencies.required = [
        { moduleKey: "institutions.registry", versionRange: r }
      ];
      raw.compatibility.synthesisCore = r;
      raw.compatibility.synthesisCms = r;
      const res = safeValidateModuleManifest(raw);
      assert.equal(res.success, true, `versionRange '${r}' should pass`);
    }

    // FAIL ranges:
    const failRanges = ["invalid-range", ">=abc", ""];
    for (const r of failRanges) {
      const raw = createValidManifest();
      raw.dependencies.required = [
        { moduleKey: "institutions.registry", versionRange: r }
      ];
      const res = safeValidateModuleManifest(raw);
      assert.equal(res.success, false, `versionRange '${r}' should fail`);
    }
  });

  it("TEST 11: Data ownership a PostgreSQL queue kontrakt", () => {
    // Invalid queueType should fail
    const rawBadQueue = createValidManifest();
    (rawBadQueue.jobs[0] as any).queueType = "redis";
    const resQueue = safeValidateModuleManifest(rawBadQueue);
    assert.equal(resQueue.success, false);

    // Invalid schemaPath should fail
    const rawBadOwnership = createValidManifest();
    rawBadOwnership.dataOwnership.tables = ["alimony_records"];
    rawBadOwnership.dataOwnership.schemaPath = "database/schema.prisma";
    const resOwnership = safeValidateModuleManifest(rawBadOwnership);
    assert.equal(resOwnership.success, true);
  });
});

describe("TMPR-NEWDEV-20260912-F1-006: Czech Manifest Validation Diagnostics & Regression", () => {
  it("SCENARIO 1: validní manifest stále PASS", () => {
    const raw = createValidManifest();
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, true);
  });

  it("SCENARIO 2: chybějící moduleKey → česká zpráva", () => {
    const raw = createValidManifest();
    delete (raw as any).moduleKey;
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(res.errors.some((err) => err.includes("[moduleKey]: Chybějící povinné pole")));
  });

  it("SCENARIO 3: invalid moduleKey → česká zpráva", () => {
    const raw = createValidManifest();
    raw.moduleKey = "invalid_key";
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[moduleKey]: Klíč modulu (moduleKey) musí mít formát jmenného prostoru")
      )
    );
  });

  it("SCENARIO 4: invalid version SemVer → česká zpráva", () => {
    const raw = createValidManifest();
    raw.version = "v1.0.0";
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[version]: Verze (version) musí být striktní platný SemVer řetězec bez prefixu 'v'")
      )
    );
  });

  it("SCENARIO 5: invalid dependency versionRange → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.required = [
      { moduleKey: "institutions.registry", versionRange: "invalid-range" }
    ];
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("Rozsah verzí (versionRange) musí být platný SemVer rozsah")
      )
    );
  });

  it("SCENARIO 6: self required dependency → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.required.push({
      moduleKey: "family.alimony",
      versionRange: "^1.0.0"
    });
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[dependencies.required]: Modul 'family.alimony' nemůže záviset sám na sobě v povinných závislostech (required)")
      )
    );
  });

  it("SCENARIO 7: self optional dependency → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.optional.push({
      moduleKey: "family.alimony",
      versionRange: "^1.0.0"
    });
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[dependencies.optional]: Modul 'family.alimony' nemůže záviset sám na sobě ve volitelných závislostech (optional)")
      )
    );
  });

  it("SCENARIO 8: self conflict → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.conflicts.push({
      moduleKey: "family.alimony",
      reason: "Konflikt sám se sebou"
    });
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[dependencies.conflicts]: Modul 'family.alimony' nemůže deklarovat konflikt sám se sebou")
      )
    );
  });

  it("SCENARIO 9: duplicate required → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.required = [
      { moduleKey: "institutions.registry", versionRange: "^1.0.0" },
      { moduleKey: "institutions.registry", versionRange: "^2.0.0" }
    ];
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("Duplicitní závislost 'institutions.registry' v povinných závislostech (required)")
      )
    );
  });

  it("SCENARIO 10: duplicate optional → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.optional = [
      { moduleKey: "support.communication", versionRange: "^1.0.0" },
      { moduleKey: "support.communication", versionRange: "^1.1.0" }
    ];
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("Duplicitní závislost 'support.communication' ve volitelných závislostech (optional)")
      )
    );
  });

  it("SCENARIO 11: required + optional duplicate → česká zpráva", () => {
    const raw = createValidManifest();
    raw.dependencies.required = [
      { moduleKey: "common.module", versionRange: "^1.0.0" }
    ];
    raw.dependencies.optional = [
      { moduleKey: "common.module", versionRange: "^1.0.0" }
    ];
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[dependencies]: Závislost 'common.module' nemůže být současně povinná (required) i volitelná (optional)")
      )
    );
  });

  it("SCENARIO 12: unknown UI surface → česká zpráva", () => {
    const raw = createValidManifest();
    (raw.surfaces.ui as any).partnerPortal = { enabled: true };
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[surfaces.ui]: Zadána neznámá UI surface; povolené surfaces jsou public, account, admin")
      )
    );
  });

  it("SCENARIO 13: unknown root surface category → česká zpráva", () => {
    const raw = createValidManifest();
    (raw.surfaces as any).mobile = { enabled: true };
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[surfaces]: Zadána neznámá kategorie surface; povoleny jsou pouze api a ui")
      )
    );
  });

  it("SCENARIO 14: invalid enum/type → česká zpráva", () => {
    const raw = createValidManifest();
    (raw.surfaces.api.surfaces as any) = ["invalid_surface"];
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(
      res.errors.some((err) =>
        err.includes("[surfaces.api.surfaces.0]: Neplatná hodnota enumu. Očekáváno jedno z: 'internal', 'synapi_private', 'synapi_public'")
      )
    );

    const rawType = createValidManifest();
    (rawType as any).version = 12345;
    const resType = safeValidateModuleManifest(rawType);
    assert.equal(resType.success, false);
    assert.ok(
      resType.errors.some((err) =>
        err.includes("[version]: Neplatný typ: očekáván string (řetězec), ale obdržen number (číslo)")
      )
    );
  });

  it("SCENARIO 15: empty required text → česká zpráva", () => {
    const rawName = createValidManifest();
    rawName.name = "";
    const resName = safeValidateModuleManifest(rawName);
    assert.equal(resName.success, false);
    assert.ok(
      resName.errors.some((err) =>
        err.includes("[name]: Název modulu (name) je povinný") || err.includes("nesmí být prázdná")
      )
    );

    const rawDesc = createValidManifest();
    rawDesc.description = "";
    const resDesc = safeValidateModuleManifest(rawDesc);
    assert.equal(resDesc.success, false);
    assert.ok(
      resDesc.errors.some((err) =>
        err.includes("[description]: Popis modulu (description) je povinný") || err.includes("nesmí být prázdná")
      )
    );

    const rawRoute = createValidManifest();
    rawRoute.routes[0]!.path = "";
    const resRoute = safeValidateModuleManifest(rawRoute);
    assert.equal(resRoute.success, false);
    assert.ok(
      resRoute.errors.some((err) =>
        err.includes("[routes.0.path]: Cesta routy (path) nesmí být prázdná")
      )
    );
  });

  it("SCENARIO 16: validateModuleManifest() exception začíná českým prefixem", () => {
    const raw = createValidManifest();
    delete (raw as any).moduleKey;
    assert.throws(
      () => validateModuleManifest(raw),
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.startsWith("Validace manifestu modulu selhala: "));
        assert.ok(err.message.includes("[moduleKey]: Chybějící povinné pole"));
        return true;
      }
    );
  });

  it("SCENARIO 17: safeValidateModuleManifest() nevrací staré anglické diagnostické fráze", () => {
    const bannedEnglishPhrases = [
      "cannot depend on itself",
      "cannot declare conflict with itself",
      "Duplicate dependency",
      "cannot be both required and optional",
      "Unknown UI surface specified",
      "Unknown surface category specified",
      "moduleKey must be",
      "version must be",
      "versionRange must be",
      "Module name is required",
      "Module description is required",
      "Route path must not be empty",
      "Permission key must not be empty",
      "jobKey must not be empty",
      "Job description must not be empty",
      "Reason for conflict must be provided",
      "Expected string, received",
      "Invalid enum value",
      "Unrecognized key(s)"
    ];

    const invalidManifests: unknown[] = [
      { ...createValidManifest(), moduleKey: "invalid_key" },
      { ...createValidManifest(), version: "v2.0.0" },
      { ...createValidManifest(), name: "" },
      { ...createValidManifest(), surfaces: { ui: { partnerPortal: { enabled: true } } } },
      {
        ...createValidManifest(),
        dependencies: {
          required: [{ moduleKey: "family.alimony", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: []
        }
      }
    ];

    for (const invalidRaw of invalidManifests) {
      const res = safeValidateModuleManifest(invalidRaw);
      assert.equal(res.success, false);
      for (const err of res.errors) {
        for (const banned of bannedEnglishPhrases) {
          assert.equal(
            err.includes(banned),
            false,
            `Error '${err}' should not contain English phrase '${banned}'`
          );
        }
      }
    }
  });

  it("SCENARIO 18: Registry nad invalid manifestem stále fail-closed", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.2.0" });
    const invalidManifest = createValidManifest();
    delete (invalidManifest as any).moduleKey;

    const dummyModule: IModule = {
      manifest: invalidManifest as any
    };

    assert.throws(
      () => registry.register(dummyModule),
      (err: any) => {
        assert.ok(err instanceof ModuleRegistryError);
        assert.equal(err.code, "INVALID_MANIFEST");
        const details = err.details as { errors?: string[] } | undefined;
        assert.ok(details?.errors?.some((e: string) => e.includes("[moduleKey]: Chybějící povinné pole")));
        return true;
      }
    );

    assert.equal(registry.has("family.alimony"), false);
    assert.equal(registry.list().length, 0);
  });

  it("SCENARIO 19: formatManifestValidationIssueCs formátuje Zod issues deterministicky do češtiny", () => {
    const mockIssue: z.ZodIssue = {
      code: z.ZodIssueCode.invalid_type,
      expected: "string",
      received: "undefined",
      path: ["moduleKey"],
      message: "Required"
    };
    const formatted = formatManifestValidationIssueCs(mockIssue);
    assert.equal(formatted, "Chybějící povinné pole (očekáván typ string (řetězec))");
  });
});
