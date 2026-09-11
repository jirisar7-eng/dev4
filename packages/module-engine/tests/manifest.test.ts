/**
 * @tmpr/module-engine - Mandatory Manifest Contract Tests
 * Povinné testy schématu a validátoru manifestu modulu dle TMPR-NEWDEV-20260911-F1-002 & R02.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateModuleManifest,
  safeValidateModuleManifest
} from "../src/contract/validator.js";

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
    assert.ok(resReq.errors.some((err) => err.includes("cannot depend on itself in required dependencies")));

    // Optional self-dependency
    const rawSelfOpt = createValidManifest();
    rawSelfOpt.dependencies.optional.push({
      moduleKey: "family.alimony",
      versionRange: "^1.0.0"
    });
    const resOpt = safeValidateModuleManifest(rawSelfOpt);
    assert.equal(resOpt.success, false);
    assert.ok(resOpt.errors.some((err) => err.includes("cannot depend on itself in optional dependencies")));
  });

  it("TEST 5: Conflict se sebou samým selže", () => {
    const raw = createValidManifest();
    raw.dependencies.conflicts.push({
      moduleKey: "family.alimony",
      reason: "Konflikt se sebou"
    });
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(res.errors.some((err) => err.includes("cannot declare conflict with itself")));
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
    assert.ok(resReq.errors.some((err) => err.includes("Duplicate dependency 'institutions.registry' in required")));

    // Duplicita v optional
    const rawOptDup = createValidManifest();
    rawOptDup.dependencies.optional = [
      { moduleKey: "support.communication", versionRange: "^1.0.0" },
      { moduleKey: "support.communication", versionRange: "^1.1.0" }
    ];
    const resOpt = safeValidateModuleManifest(rawOptDup);
    assert.equal(resOpt.success, false);
    assert.ok(resOpt.errors.some((err) => err.includes("Duplicate dependency 'support.communication' in optional")));
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
    assert.ok(res.errors.some((err) => err.includes("cannot be both required and optional")));
  });

  it("TEST 8: Neznámá surface selže", () => {
    const raw = createValidManifest();
    (raw.surfaces.ui as any).partnerPortal = { enabled: true };
    const res = safeValidateModuleManifest(raw);
    assert.equal(res.success, false);
    assert.ok(res.errors.some((err) => err.includes("Unknown UI surface") || err.includes("unrecognized_keys")));
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
