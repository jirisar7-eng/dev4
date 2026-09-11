/**
 * @tmpr/module-engine - Dependency Resolver Mandatory Tests
 * Testovací sada pro ověření chování Dependency Resolveru dle TMPR-NEWDEV-20260911-F1-004.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ModuleRegistry,
  DependencyResolver,
  canonicalizeCycle,
  detectCycles,
  topologicalSort,
  type IModule,
  type IModuleManifest,
  type DependencyIssueCode,
  type DependencyIssueSeverity
} from "../src/index.js";

const DEFAULT_OPTIONS = { synthesisCoreVersion: "1.0.0" };

/**
 * Pomocná továrna na testovací moduly s konfigurovatelnými závislostmi.
 */
function createTestModule(
  moduleKey: string,
  overrides?: {
    version?: string;
    required?: Array<{ moduleKey: string; versionRange?: string; reason?: string }>;
    optional?: Array<{ moduleKey: string; versionRange?: string; reason?: string }>;
    conflicts?: Array<{ moduleKey: string; reason?: string }>;
  }
): IModule {
  const manifest: IModuleManifest = {
    moduleKey,
    name: `Test Module ${moduleKey}`,
    description: `Testovací modul ${moduleKey}`,
    version: overrides?.version ?? "1.0.0",
    compatibility: {
      synthesisCore: "^1.0.0"
    },
    dependencies: {
      required: (overrides?.required ?? []).map((r) => ({
        moduleKey: r.moduleKey,
        versionRange: r.versionRange ?? "*",
        reason: r.reason
      })),
      optional: (overrides?.optional ?? []).map((o) => ({
        moduleKey: o.moduleKey,
        versionRange: o.versionRange ?? "*",
        reason: o.reason
      })),
      conflicts: (overrides?.conflicts ?? []).map((c) => ({
        moduleKey: c.moduleKey,
        reason: c.reason ?? "Test conflict"
      }))
    },
    lifecycle: {
      supportedHooks: ["enable", "disable"],
      requiresRestart: false,
      disableBehavior: {
        mode: "fail_closed",
        dataRetention: "retain"
      }
    },
    surfaces: {
      api: { enabled: true, surfaces: ["synapi_public"] },
      ui: { public: { enabled: true, routePrefix: `/${moduleKey}` } }
    },
    routes: [
      { path: `/${moduleKey}/index`, surface: "public", requiresAuth: false }
    ],
    permissions: [
      {
        key: `${moduleKey}.read`,
        name: "Read",
        description: "Read access",
        defaultRoles: ["admin"]
      }
    ],
    capabilities: [`${moduleKey}.cap`],
    dataOwnership: {
      tables: [`tbl_${moduleKey.replace(/\./g, "_")}`],
      schemaPath: "database/schema/schema.prisma",
      migrationsPath: "database/migrations",
      isolatedData: true
    },
    events: { emits: [], subscribes: [] },
    jobs: [],
    cms: {
      contentPacks: [],
      textKeys: [],
      help: { cs: { enabled: false, path: "help/cs" } }
    },
    healthCheck: { enabled: false, intervalSeconds: 60 },
    fallback: { enabled: false }
  };

  return {
    manifest
  };
}

describe("TMPR-NEWDEV-20260911-F1-004: Dependency Resolver & Cycle Detection", () => {
  // 1. modul bez dependencies -> PASS
  it("1. modul bez dependencies -> PASS", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.single"));
    const resolver = new DependencyResolver(registry);

    const forRes = resolver.resolveFor("test.single");
    assert.equal(forRes.ok, true);
    assert.deepEqual(forRes.resolvedOrder, ["test.single"]);
    assert.equal(forRes.blockers.length, 0);
    assert.equal(forRes.advisories.length, 0);
    assert.equal(forRes.cycles.length, 0);

    const allRes = resolver.resolveAll();
    assert.equal(allRes.ok, true);
    assert.deepEqual(allRes.resolvedOrder, ["test.single"]);
  });

  // 2. A requires B -> [B, A]
  it("2. A requires B -> [B, A]", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.b"));
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.b", "test.a"]);
    assert.equal(res.blockers.length, 0);
  });

  // 3. A requires B, B requires C -> [C, B, A]
  it("3. A requires B, B requires C -> [C, B, A]", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.c"));
    registry.register(
      createTestModule("test.b", {
        required: [{ moduleKey: "test.c", versionRange: "^1.0.0" }]
      })
    );
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.c", "test.b", "test.a"]);
  });

  // 4. deterministické pořadí nezávislých modulů
  it("4. deterministické pořadí nezávislých modulů", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.z"));
    registry.register(createTestModule("test.m"));
    registry.register(createTestModule("test.a"));
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveAll();
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.a", "test.m", "test.z"]);
  });

  // 5. direct missing required dependency -> blocker + exact module/dependency
  it("5. direct missing required dependency -> blocker + exact module/dependency", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.missing", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    const b = res.blockers[0]!;
    assert.equal(b.code, "MISSING_REQUIRED_DEPENDENCY");
    assert.equal(b.severity, "blocker");
    assert.equal(b.moduleKey, "test.a");
    assert.equal(b.dependencyKey, "test.missing");
    assert.equal(b.requiredRange, "^1.0.0");
  });

  // 6. transitive missing required dependency -> blocker
  it("6. transitive missing required dependency -> blocker", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.b", {
        required: [{ moduleKey: "test.missing", versionRange: "^2.0.0" }]
      })
    );
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    const b = res.blockers[0]!;
    assert.equal(b.code, "MISSING_REQUIRED_DEPENDENCY");
    assert.equal(b.moduleKey, "test.b");
    assert.equal(b.dependencyKey, "test.missing");
    assert.equal(b.requiredRange, "^2.0.0");
  });

  // 7. compatible required SemVer -> PASS
  it("7. compatible required SemVer -> PASS", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.b", { version: "1.2.3" }));
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.b", "test.a"]);
  });

  // 8. incompatible required SemVer -> blocker s requiredRange + actualVersion
  it("8. incompatible required SemVer -> blocker s requiredRange + actualVersion", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.b", { version: "2.0.0" }));
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    const b = res.blockers[0]!;
    assert.equal(b.code, "REQUIRED_VERSION_INCOMPATIBLE");
    assert.equal(b.severity, "blocker");
    assert.equal(b.moduleKey, "test.a");
    assert.equal(b.dependencyKey, "test.b");
    assert.equal(b.requiredRange, "^1.0.0");
    assert.equal(b.actualVersion, "2.0.0");
  });

  // 9. missing optional dependency -> advisory, ne blocker
  it("9. missing optional dependency -> advisory, ne blocker", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.a", {
        optional: [{ moduleKey: "test.optional-missing", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.a"]);
    assert.equal(res.blockers.length, 0);
    assert.equal(res.advisories.length, 1);
    const adv = res.advisories[0]!;
    assert.equal(adv.code, "OPTIONAL_DEPENDENCY_MISSING");
    assert.equal(adv.severity, "advisory");
    assert.equal(adv.moduleKey, "test.a");
    assert.equal(adv.dependencyKey, "test.optional-missing");
    assert.equal(adv.requiredRange, "^1.0.0");
  });

  // 10. incompatible optional dependency -> advisory, ne blocker
  it("10. incompatible optional dependency -> advisory, ne blocker", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.b", { version: "1.0.0" }));
    registry.register(
      createTestModule("test.a", {
        optional: [{ moduleKey: "test.b", versionRange: "^2.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.a"]);
    assert.equal(res.blockers.length, 0);
    assert.equal(res.advisories.length, 1);
    const adv = res.advisories[0]!;
    assert.equal(adv.code, "OPTIONAL_VERSION_INCOMPATIBLE");
    assert.equal(adv.severity, "advisory");
    assert.equal(adv.moduleKey, "test.a");
    assert.equal(adv.dependencyKey, "test.b");
    assert.equal(adv.requiredRange, "^2.0.0");
    assert.equal(adv.actualVersion, "1.0.0");
  });

  // 11. compatible optional dependency -> neblokuje
  it("11. compatible optional dependency -> neblokuje", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.b", { version: "1.5.0" }));
    registry.register(
      createTestModule("test.a", {
        optional: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.a"]);
    assert.equal(res.blockers.length, 0);
    assert.equal(res.advisories.length, 0);
  });

  // 12. two-node required cycle A -> B -> A -> blocker
  it("12. two-node required cycle A -> B -> A -> blocker", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b" }]
      })
    );
    registry.register(
      createTestModule("test.b", {
        required: [{ moduleKey: "test.a" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    assert.equal(res.blockers[0]!.code, "DEPENDENCY_CYCLE");
    assert.deepEqual(res.cycles, [["test.a", "test.b", "test.a"]]);
  });

  // 13. three-node cycle A -> B -> C -> A -> blocker
  it("13. three-node cycle A -> B -> C -> A -> blocker", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b" }]
      })
    );
    registry.register(
      createTestModule("test.b", {
        required: [{ moduleKey: "test.c" }]
      })
    );
    registry.register(
      createTestModule("test.c", {
        required: [{ moduleKey: "test.a" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    assert.equal(res.blockers[0]!.code, "DEPENDENCY_CYCLE");
    assert.deepEqual(res.cycles, [["test.a", "test.b", "test.c", "test.a"]]);
  });

  // 14. dva oddělené required cycles -> oba detekovány deterministicky
  it("14. dva oddělené required cycles -> oba detekovány deterministicky", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    // Cyklus 1: A <-> B
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b" }]
      })
    );
    registry.register(
      createTestModule("test.b", {
        required: [{ moduleKey: "test.a" }]
      })
    );
    // Cyklus 2: X <-> Y
    registry.register(
      createTestModule("test.x", {
        required: [{ moduleKey: "test.y" }]
      })
    );
    registry.register(
      createTestModule("test.y", {
        required: [{ moduleKey: "test.x" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveAll();
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.cycles.length, 2);
    assert.deepEqual(res.cycles, [
      ["test.a", "test.b", "test.a"],
      ["test.x", "test.y", "test.x"]
    ]);
  });

  // 15. diamond graph: A requires B,C; B requires D; C requires D
  it("15. diamond graph: žádná duplicita D, D před B/C a B/C před A", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.d"));
    registry.register(
      createTestModule("test.b", {
        required: [{ moduleKey: "test.d" }]
      })
    );
    registry.register(
      createTestModule("test.c", {
        required: [{ moduleKey: "test.d" }]
      })
    );
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b" }, { moduleKey: "test.c" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.d", "test.b", "test.c", "test.a"]);
    // D se vyskytuje právě jednou
    assert.equal(res.resolvedOrder.filter((k) => k === "test.d").length, 1);
  });

  // 16. resolveFor(A) ignoruje chybu nesouvisejícího X
  it("16. resolveFor(A) ignoruje chybu nesouvisejícího X", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.a"));
    registry.register(
      createTestModule("test.x", {
        required: [{ moduleKey: "test.missing" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.a"]);
    assert.equal(res.blockers.length, 0);
  });

  // 17. resolveAll() tutéž chybu X zachytí
  it("17. resolveAll() tutéž chybu X zachytí", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.a"));
    registry.register(
      createTestModule("test.x", {
        required: [{ moduleKey: "test.missing" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveAll();
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    assert.equal(res.blockers[0]!.moduleKey, "test.x");
    assert.equal(res.blockers[0]!.dependencyKey, "test.missing");
  });

  // 18. optional-only cycle -> NEBLOKUJE
  it("18. optional-only cycle -> NEBLOKUJE", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.a", {
        optional: [{ moduleKey: "test.b" }]
      })
    );
    registry.register(
      createTestModule("test.b", {
        optional: [{ moduleKey: "test.a" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveAll();
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, ["test.a", "test.b"]);
    assert.equal(res.blockers.length, 0);
    assert.equal(res.cycles.length, 0);
  });

  // 19. target module není registrovaný -> TARGET_NOT_REGISTERED + ok=false
  it("19. target module není registrovaný -> TARGET_NOT_REGISTERED + ok=false", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("unknown.module");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 1);
    const b = res.blockers[0]!;
    assert.equal(b.code, "TARGET_NOT_REGISTERED");
    assert.equal(b.severity, "blocker");
    assert.equal(b.moduleKey, "unknown.module");
  });

  // 20. blocker vždy způsobí: resolvedOrder = []
  it("20. blocker vždy způsobí: resolvedOrder = []", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.b", { version: "2.0.0" }));
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.b", versionRange: "^1.0.0" }]
      })
    );
    const resolver = new DependencyResolver(registry);

    const res = resolver.resolveFor("test.a");
    assert.equal(res.ok, false);
    assert.deepEqual(res.resolvedOrder, []);
  });

  // 21. registration order permutation -> stejný resolvedOrder
  it("21. registration order permutation -> stejný resolvedOrder", () => {
    const reg1 = new ModuleRegistry(DEFAULT_OPTIONS);
    reg1.register(createTestModule("test.d"));
    reg1.register(createTestModule("test.c"));
    reg1.register(createTestModule("test.b"));
    reg1.register(createTestModule("test.a"));

    const reg2 = new ModuleRegistry(DEFAULT_OPTIONS);
    reg2.register(createTestModule("test.a"));
    reg2.register(createTestModule("test.b"));
    reg2.register(createTestModule("test.c"));
    reg2.register(createTestModule("test.d"));

    const res1 = new DependencyResolver(reg1).resolveAll();
    const res2 = new DependencyResolver(reg2).resolveAll();

    assert.equal(res1.ok, true);
    assert.equal(res2.ok, true);
    assert.deepEqual(res1.resolvedOrder, res2.resolvedOrder);
  });

  // 22. Resolver nezmění Registry state
  it("22. Resolver nezmění Registry state", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.a"));
    const recordsBefore = registry.listRecords();
    const stateBefore = recordsBefore[0]!.state;

    const resolver = new DependencyResolver(registry);
    resolver.resolveFor("test.a");
    resolver.resolveAll();

    const recordsAfter = registry.listRecords();
    assert.equal(recordsAfter[0]!.state, stateBefore);
  });

  // 23. Resolver nezmění Registry manifest
  it("23. Resolver nezmění Registry manifest", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(createTestModule("test.a"));
    const manifestBefore = JSON.stringify(registry.getRecord("test.a")!.manifest);

    const resolver = new DependencyResolver(registry);
    resolver.resolveFor("test.a");
    resolver.resolveAll();

    const manifestAfter = JSON.stringify(registry.getRecord("test.a")!.manifest);
    assert.equal(manifestAfter, manifestBefore);
  });

  // 24. všechny výsledky mají deterministické typed issue codes a metadata
  it("24. všechny výsledky mají deterministické typed issue codes a metadata", () => {
    const validCodes: DependencyIssueCode[] = [
      "TARGET_NOT_REGISTERED",
      "MISSING_REQUIRED_DEPENDENCY",
      "REQUIRED_VERSION_INCOMPATIBLE",
      "DEPENDENCY_CYCLE",
      "OPTIONAL_DEPENDENCY_MISSING",
      "OPTIONAL_VERSION_INCOMPATIBLE"
    ];
    const validSeverities: DependencyIssueSeverity[] = ["blocker", "advisory"];

    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    registry.register(
      createTestModule("test.a", {
        required: [{ moduleKey: "test.missing", versionRange: "^1.0.0" }],
        optional: [{ moduleKey: "test.opt-missing" }]
      })
    );
    const resolver = new DependencyResolver(registry);
    const res = resolver.resolveFor("test.a");

    for (const b of res.blockers) {
      assert.ok(validCodes.includes(b.code));
      assert.ok(validSeverities.includes(b.severity));
      assert.equal(typeof b.message, "string");
      assert.equal(typeof b.moduleKey, "string");
    }

    for (const a of res.advisories) {
      assert.ok(validCodes.includes(a.code));
      assert.ok(validSeverities.includes(a.severity));
      assert.equal(typeof a.message, "string");
      assert.equal(typeof a.moduleKey, "string");
    }
  });

  // Algoritmické testy graph utilities
  it("canonicalizeCycle správně rotuje a normalizuje cyklus", () => {
    assert.deepEqual(canonicalizeCycle(["B", "C", "A", "B"]), ["A", "B", "C", "A"]);
    assert.deepEqual(canonicalizeCycle(["C", "A", "B", "C"]), ["A", "B", "C", "A"]);
    assert.deepEqual(canonicalizeCycle(["A", "B", "C", "A"]), ["A", "B", "C", "A"]);
  });

  it("detectCycles detekuje a seřadí cykly", () => {
    const adj = new Map([
      ["A", ["B"]],
      ["B", ["A"]]
    ]);
    const cycles = detectCycles(["A", "B"], adj);
    assert.deepEqual(cycles, [["A", "B", "A"]]);
  });

  it("topologicalSort vrací deterministické pořadí nebo null při cyklu", () => {
    const deps = new Map([
      ["A", ["B"]],
      ["B", []]
    ]);
    const order = topologicalSort(["A", "B"], deps);
    assert.deepEqual(order, ["B", "A"]);

    const cyclicDeps = new Map([
      ["A", ["B"]],
      ["B", ["A"]]
    ]);
    const cyclicOrder = topologicalSort(["A", "B"], cyclicDeps);
    assert.equal(cyclicOrder, null);
  });

  // Prázdný registr
  it("resolveAll na prázdném registru vrací ok=true a prázdný resolvedOrder", () => {
    const registry = new ModuleRegistry(DEFAULT_OPTIONS);
    const resolver = new DependencyResolver(registry);
    const res = resolver.resolveAll();
    assert.equal(res.ok, true);
    assert.deepEqual(res.resolvedOrder, []);
    assert.equal(res.blockers.length, 0);
    assert.equal(res.advisories.length, 0);
  });
});
