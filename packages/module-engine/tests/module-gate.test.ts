/**
 * @tmpr/module-engine - Module Gate Test Suite
 * Testy pro autoritativní framework-independent Module Gate (F1-005 / NEWDEV-13).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  ModuleRegistry,
  DependencyResolver,
  ModuleGate,
  ModuleGateError,
  type IModule,
  type IModuleManifest,
} from "../src/index.js";

function createTestModule(overrides: Partial<IModuleManifest> = {}): IModule {
  const key = overrides.moduleKey || "test.alpha";
  const manifest: IModuleManifest = {
    moduleKey: key,
    name: "Test Module " + key,
    description: "Module for Gate unit testing",
    version: "1.0.0",
    compatibility: {
      synthesisCore: "^1.0.0",
    },
    dependencies: {
      required: [],
      optional: [],
      conflicts: [],
    },
    lifecycle: {
      supportedHooks: ["enable", "disable"],
      requiresRestart: false,
      disableBehavior: {
        mode: "fail_closed",
        dataRetention: "retain",
      },
    },
    surfaces: {
      api: { enabled: true, surfaces: ["synapi_public"] },
      ui: {
        public: { enabled: true, routePrefix: "/" + key.replace(".", "/") },
        admin: { enabled: true, routePrefix: "/admin" },
        account: { enabled: true, routePrefix: "/account" },
      },
    },
    routes: [
      {
        surface: "public",
        path: "/" + key.replace(".", "/") + "/overview",
        requiresAuth: false,
      },
    ],
    permissions: [],
    capabilities: ["test:read"],
    dataOwnership: {
      tables: ["test_table_" + key.replace(".", "_")],
      schemaPath: "database/schema/schema.prisma",
      migrationsPath: "database/migrations",
      isolatedData: true,
    },
    events: { emits: [], subscribes: [] },
    jobs: [],
    cms: {
      contentPacks: [],
      textKeys: [],
      help: { cs: { enabled: false, path: "help/cs" } },
    },
    healthCheck: { enabled: false, intervalSeconds: 60 },
    fallback: { enabled: false },
    ...overrides,
  };

  return {
    manifest,
  };
}

function createRegistry(): ModuleRegistry {
  return new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
}

test("TMPR-NEWDEV-20260912-F1-005: Route & API Module Gates", async (t) => {
  // Test 1: neregistrovaný modul -> DENY / MODULE_NOT_REGISTERED
  await t.test("1. unregistered module -> DENY / MODULE_NOT_REGISTERED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    const decision = await gate.evaluateModuleAccess("non.existent");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "MODULE_NOT_REGISTERED");
    assert.equal(decision.moduleKey, "non.existent");

    const enabled = await gate.isModuleEnabled("non.existent");
    assert.equal(enabled, false);
  });

  // Test 2: uninstalled -> DENY
  await t.test("2. uninstalled -> DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.uninstalled" }));
    assert.equal(registry.getRecord("test.uninstalled")?.state, "uninstalled");

    const decision = await gate.evaluateModuleAccess("test.uninstalled");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "MODULE_NOT_ENABLED");
    assert.equal(decision.state, "uninstalled");
  });

  // Test 3: installed -> DENY
  await t.test("3. installed -> DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.installed" }));
    registry.recordState("test.installed", "installed");

    const decision = await gate.evaluateModuleAccess("test.installed");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "MODULE_NOT_ENABLED");
    assert.equal(decision.state, "installed");
  });

  // Test 4: disabled -> DENY
  await t.test("4. disabled -> DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.disabled" }));
    registry.recordState("test.disabled", "disabled");

    const decision = await gate.evaluateModuleAccess("test.disabled");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "MODULE_NOT_ENABLED");
    assert.equal(decision.state, "disabled");
  });

  // Test 5: failed -> DENY
  await t.test("5. failed -> DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.failed" }));
    registry.recordState("test.failed", "failed");

    const decision = await gate.evaluateModuleAccess("test.failed");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "MODULE_NOT_ENABLED");
    assert.equal(decision.state, "failed");
  });

  // Test 6: enabled + enabled public surface -> ALLOW
  await t.test("6. enabled + enabled public surface -> ALLOW", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.enabled-pub" }));
    registry.recordState("test.enabled-pub", "enabled");

    const decision = await gate.evaluateModuleAccess("test.enabled-pub", "public");
    assert.equal(decision.allowed, true);
    assert.equal(decision.code, "ALLOW");
    assert.equal(decision.state, "enabled");
    assert.equal(decision.surface, "public");
  });

  // Test 7: enabled + disabled/undefined public surface -> DENY / SURFACE_NOT_ENABLED
  await t.test("7. enabled + disabled/undefined public surface -> DENY / SURFACE_NOT_ENABLED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.no-public",
        surfaces: {
          api: { enabled: true, surfaces: ["synapi_public"] },
          ui: {
            public: { enabled: false },
            admin: { enabled: true },
          },
        },
      })
    );
    registry.recordState("test.no-public", "enabled");

    const decision = await gate.evaluateModuleAccess("test.no-public", "public");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "SURFACE_NOT_ENABLED");
  });

  // Test 8: enabled + admin surface -> správné rozhodnutí
  await t.test("8. enabled + admin surface -> správné rozhodnutí", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.admin-on",
        surfaces: {
          api: { enabled: true, surfaces: ["synapi_public"] },
          ui: { admin: { enabled: true } },
        },
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.admin-off",
        surfaces: {
          api: { enabled: true, surfaces: ["synapi_public"] },
          ui: { admin: { enabled: false } },
        },
      })
    );
    registry.recordState("test.admin-on", "enabled");
    registry.recordState("test.admin-off", "enabled");

    assert.equal((await gate.evaluateModuleAccess("test.admin-on", "admin")).allowed, true);
    assert.equal((await gate.evaluateModuleAccess("test.admin-off", "admin")).allowed, false);
    assert.equal((await gate.evaluateModuleAccess("test.admin-off", "admin")).code, "SURFACE_NOT_ENABLED");
  });

  // Test 9: enabled + API surface -> správné rozhodnutí
  await t.test("9. enabled + API surface -> správné rozhodnutí", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.api-on",
        surfaces: {
          api: { enabled: true, surfaces: ["synapi_public"] },
          ui: {},
        },
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.api-off",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: {},
        },
      })
    );
    registry.recordState("test.api-on", "enabled");
    registry.recordState("test.api-off", "enabled");

    assert.equal((await gate.evaluateModuleAccess("test.api-on", "api")).allowed, true);
    assert.equal((await gate.evaluateModuleAccess("test.api-off", "api")).allowed, false);
    assert.equal((await gate.evaluateModuleAccess("test.api-off", "api")).code, "SURFACE_NOT_ENABLED");
  });

  // Test 10: registered route + enabled module -> ALLOW
  await t.test("10. registered route + enabled module -> ALLOW", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.route-mod",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: { public: { enabled: true } },
        },
        routes: [
          {
            surface: "public",
            path: "/my/route",
            requiresAuth: false,
          },
        ],
      })
    );
    registry.recordState("test.route-mod", "enabled");

    const decision = await gate.evaluateRouteAccess("public", "/my/route");
    assert.equal(decision.allowed, true);
    assert.equal(decision.code, "ALLOW");
    assert.equal(decision.moduleKey, "test.route-mod");
    assert.equal(decision.path, "/my/route");
    assert.equal(decision.requiresAuth, false);
  });

  // Test 11: registered route + disabled module -> DENY
  await t.test("11. registered route + disabled module -> DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.route-off",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: { public: { enabled: true } },
        },
        routes: [
          {
            surface: "public",
            path: "/my/closed/route",
            requiresAuth: false,
          },
        ],
      })
    );
    registry.recordState("test.route-off", "disabled");

    const decision = await gate.evaluateRouteAccess("public", "/my/closed/route");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "MODULE_NOT_ENABLED");
    assert.equal(decision.moduleKey, "test.route-off");
    assert.equal(decision.path, "/my/closed/route");
  });

  // Test 12: unknown route -> ROUTE_NOT_REGISTERED
  await t.test("12. unknown route -> ROUTE_NOT_REGISTERED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    const decision = await gate.evaluateRouteAccess("public", "/completely/unknown/route");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "ROUTE_NOT_REGISTERED");
    assert.equal(decision.surface, "public");
    assert.equal(decision.path, "/completely/unknown/route");
  });

  // Test 13: required dependency missing -> DEPENDENCY_BLOCKED
  await t.test("13. required dependency missing -> DEPENDENCY_BLOCKED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.dependent",
        dependencies: {
          required: [{ moduleKey: "test.missing-dep", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.dependent", "enabled");

    const decision = await gate.evaluateModuleAccess("test.dependent");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "DEPENDENCY_BLOCKED");
    assert.ok(decision.dependencyBlockers && decision.dependencyBlockers.length > 0);
    assert.equal(decision.dependencyBlockers[0]?.code, "MISSING_REQUIRED_DEPENDENCY");
  });

  // Test 14: required dependency version incompatible -> DEPENDENCY_BLOCKED
  await t.test("14. required dependency version incompatible -> DEPENDENCY_BLOCKED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.dep-provider",
        version: "2.0.0",
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.dep-consumer",
        dependencies: {
          required: [{ moduleKey: "test.dep-provider", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.dep-provider", "enabled");
    registry.recordState("test.dep-consumer", "enabled");

    const decision = await gate.evaluateModuleAccess("test.dep-consumer");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "DEPENDENCY_BLOCKED");
    assert.ok(decision.dependencyBlockers?.some((b) => b.code === "REQUIRED_VERSION_INCOMPATIBLE"));
  });

  // Test 15: required dependency cycle -> DEPENDENCY_BLOCKED
  await t.test("15. required dependency cycle -> DEPENDENCY_BLOCKED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.cycle-a",
        dependencies: {
          required: [{ moduleKey: "test.cycle-b", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.cycle-b",
        dependencies: {
          required: [{ moduleKey: "test.cycle-a", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.cycle-a", "enabled");
    registry.recordState("test.cycle-b", "enabled");

    const decision = await gate.evaluateModuleAccess("test.cycle-a");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "DEPENDENCY_BLOCKED");
    assert.ok(decision.dependencyBlockers?.some((b) => b.code === "DEPENDENCY_CYCLE"));
  });

  // Test 16: optional dependency missing -> NEBLOKUJE
  await t.test("16. optional dependency missing -> NEBLOKUJE", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.opt-consumer",
        dependencies: {
          required: [],
          optional: [{ moduleKey: "test.non-existent-opt", versionRange: "^1.0.0" }],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.opt-consumer", "enabled");

    const decision = await gate.evaluateModuleAccess("test.opt-consumer");
    assert.equal(decision.allowed, true);
    assert.equal(decision.code, "ALLOW");
  });

  // Test 17: optional dependency version advisory -> NEBLOKUJE
  await t.test("17. optional dependency version advisory -> NEBLOKUJE", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.opt-target",
        version: "2.5.0",
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.opt-caller",
        dependencies: {
          required: [],
          optional: [{ moduleKey: "test.opt-target", versionRange: "^1.0.0" }],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.opt-target", "enabled");
    registry.recordState("test.opt-caller", "enabled");

    const decision = await gate.evaluateModuleAccess("test.opt-caller");
    assert.equal(decision.allowed, true);
    assert.equal(decision.code, "ALLOW");
  });

  // Test 18: required dependency exists, ale state = disabled -> REQUIRED_DEPENDENCY_NOT_ENABLED
  await t.test("18. required dependency exists, ale state = disabled -> REQUIRED_DEPENDENCY_NOT_ENABLED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.dep-base",
        version: "1.0.0",
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.dep-user",
        dependencies: {
          required: [{ moduleKey: "test.dep-base", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.dep-base", "disabled");
    registry.recordState("test.dep-user", "enabled");

    const decision = await gate.evaluateModuleAccess("test.dep-user");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "REQUIRED_DEPENDENCY_NOT_ENABLED");
    assert.equal(decision.requiredDependencyKey, "test.dep-base");
    assert.equal(decision.requiredDependencyState, "disabled");
  });

  // Test 19: required dependency state = failed -> DENY
  await t.test("19. required dependency state = failed -> DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({ moduleKey: "test.dep-failed-base" })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.dep-failed-user",
        dependencies: {
          required: [{ moduleKey: "test.dep-failed-base", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.dep-failed-base", "failed");
    registry.recordState("test.dep-failed-user", "enabled");

    const decision = await gate.evaluateModuleAccess("test.dep-failed-user");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "REQUIRED_DEPENDENCY_NOT_ENABLED");
    assert.equal(decision.requiredDependencyState, "failed");
  });

  // Test 20: required dependency state = enabled -> dependent může projít
  await t.test("20. required dependency state = enabled -> dependent může projít", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({ moduleKey: "test.dep-ok-base" })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.dep-ok-user",
        dependencies: {
          required: [{ moduleKey: "test.dep-ok-base", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.recordState("test.dep-ok-base", "enabled");
    registry.recordState("test.dep-ok-user", "enabled");

    const decision = await gate.evaluateModuleAccess("test.dep-ok-user");
    assert.equal(decision.allowed, true);
    assert.equal(decision.code, "ALLOW");
  });

  // Test 21: transitive required dependency disabled -> dependent DENY
  await t.test("21. transitive required dependency disabled -> dependent DENY", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    // C -> B -> A
    registry.register(createTestModule({ moduleKey: "test.trans-c" }));
    registry.register(
      createTestModule({
        moduleKey: "test.trans-b",
        dependencies: {
          required: [{ moduleKey: "test.trans-c", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.trans-a",
        dependencies: {
          required: [{ moduleKey: "test.trans-b", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      })
    );

    registry.recordState("test.trans-c", "disabled"); // ROOT dependency disabled
    registry.recordState("test.trans-b", "enabled");
    registry.recordState("test.trans-a", "enabled");

    const decision = await gate.evaluateModuleAccess("test.trans-a");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "REQUIRED_DEPENDENCY_NOT_ENABLED");
    assert.equal(decision.requiredDependencyKey, "test.trans-c");
  });

  // Test 22: route decision předá requiresAuth metadata
  await t.test("22. route decision předá requiresAuth metadata", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.meta-mod",
        routes: [
          { surface: "public", path: "/pub/login", requiresAuth: false },
          { surface: "public", path: "/pub/profile", requiresAuth: true },
        ],
      })
    );
    registry.recordState("test.meta-mod", "enabled");

    const d1 = await gate.evaluateRouteAccess("public", "/pub/login");
    assert.equal(d1.allowed, true);
    assert.equal(d1.requiresAuth, false);

    const d2 = await gate.evaluateRouteAccess("public", "/pub/profile");
    assert.equal(d2.allowed, true);
    assert.equal(d2.requiresAuth, true);
  });

  // Test 23: route decision předá permission metadata
  await t.test("23. route decision předá permission metadata", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.perm-mod",
        routes: [
          {
            surface: "admin",
            path: "/admin/audit",
            requiresAuth: true,
            permission: "audit.read",
          },
        ],
      })
    );
    registry.recordState("test.perm-mod", "enabled");

    const dec = await gate.evaluateRouteAccess("admin", "/admin/audit");
    assert.equal(dec.allowed, true);
    assert.equal(dec.requiredPermission, "audit.read");
    assert.equal(dec.requiresAuth, true);
  });

  // Test 24: recordState enabled -> disabled se projeví okamžitě bez nové Gate instance
  await t.test("24. recordState enabled -> disabled se projeví okamžitě bez nové Gate instance", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.fresh-state" }));
    registry.recordState("test.fresh-state", "enabled");

    assert.equal(await gate.isModuleEnabled("test.fresh-state"), true);

    // Změna v registru bez nové Gate instance
    registry.recordState("test.fresh-state", "disabled");

    assert.equal(await gate.isModuleEnabled("test.fresh-state"), false);
    const dec = await gate.evaluateModuleAccess("test.fresh-state");
    assert.equal(dec.allowed, false);
    assert.equal(dec.code, "MODULE_NOT_ENABLED");
    assert.equal(dec.state, "disabled");
  });

  // Test 25: Gate nezmění Registry state
  await t.test("25. Gate nezmění Registry state", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.immutable-state" }));
    registry.recordState("test.immutable-state", "installed");

    await gate.evaluateModuleAccess("test.immutable-state");
    await gate.evaluateRouteAccess("public", "/test/immutable/state/overview");

    assert.equal(registry.getRecord("test.immutable-state")?.state, "installed");
  });

  // Test 26: Gate nezmění manifest
  await t.test("26. Gate nezmění manifest", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.immutable-manifest" }));
    registry.recordState("test.immutable-manifest", "enabled");

    await gate.evaluateModuleAccess("test.immutable-manifest");
    const record = registry.getRecord("test.immutable-manifest");
    assert.ok(record);
    assert.equal(Object.isFrozen(record.manifest), true);
  });

  // Test 27: Gate nespustí žádný lifecycle hook
  await t.test("27. Gate nespustí žádný lifecycle hook", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    let hookCalledCount = 0;
    const baseMod = createTestModule({ moduleKey: "test.hooks-check" });
    const module = {
      ...baseMod,
      onInstall: async () => { hookCalledCount++; },
      onEnable: async () => { hookCalledCount++; },
      onDisable: async () => { hookCalledCount++; },
      onUninstall: async () => { hookCalledCount++; },
      onHealthCheck: async () => { hookCalledCount++; return { status: "healthy" as const, checkedAt: new Date().toISOString() }; },
    };

    registry.register(module);
    registry.recordState("test.hooks-check", "enabled");

    await gate.evaluateModuleAccess("test.hooks-check");
    await gate.evaluateRouteAccess("public", "/test/hooks/check/overview");
    await gate.isModuleEnabled("test.hooks-check");

    assert.equal(hookCalledCount, 0, "Gate nesmí volat žádný lifecycle hook!");
  });

  // Test 28: public/admin/account/api jsou vyhodnoceny odděleně
  await t.test("28. public/admin/account/api jsou vyhodnoceny odděleně", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.multi-surface",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: {
            public: { enabled: true },
            admin: { enabled: false },
            account: { enabled: true },
          },
        },
      })
    );
    registry.recordState("test.multi-surface", "enabled");

    assert.equal((await gate.evaluateModuleAccess("test.multi-surface", "public")).allowed, true);
    assert.equal((await gate.evaluateModuleAccess("test.multi-surface", "account")).allowed, true);
    assert.equal((await gate.evaluateModuleAccess("test.multi-surface", "admin")).allowed, false);
    assert.equal((await gate.evaluateModuleAccess("test.multi-surface", "api")).allowed, false);
  });

  // Test 29: stejný path na jiné surface respektuje správného route ownera
  await t.test("29. stejný path na jiné surface respektuje správného route ownera", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.account-mod",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: { account: { enabled: true } },
        },
        routes: [{ surface: "account", path: "/dashboard", requiresAuth: false }],
      })
    );
    registry.register(
      createTestModule({
        moduleKey: "test.admin-mod",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: { admin: { enabled: false } },
        },
        routes: [{ surface: "admin", path: "/dashboard", requiresAuth: false }],
      })
    );
    registry.recordState("test.account-mod", "enabled");
    registry.recordState("test.admin-mod", "enabled");

    const accDecision = await gate.evaluateRouteAccess("account", "/dashboard");
    assert.equal(accDecision.allowed, true);
    assert.equal(accDecision.moduleKey, "test.account-mod");

    const admDecision = await gate.evaluateRouteAccess("admin", "/dashboard");
    assert.equal(admDecision.allowed, false);
    assert.equal(admDecision.code, "SURFACE_NOT_ENABLED");
    assert.equal(admDecision.moduleKey, "test.admin-mod");
  });

  // Test 30: výsledek je deterministický pro stejný Registry stav
  await t.test("30. výsledek je deterministický pro stejný Registry stav", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.det-mod" }));
    registry.recordState("test.det-mod", "enabled");

    const first = await gate.evaluateModuleAccess("test.det-mod", "public");
    for (let i = 0; i < 10; i++) {
      const current = await gate.evaluateModuleAccess("test.det-mod", "public");
      assert.deepEqual(current, first);
    }
  });

  // Test 31: Convenience methods: isModuleEnabled a assertModuleAccess
  await t.test("31. Convenience methods: isModuleEnabled a assertModuleAccess", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.convenience" }));
    registry.recordState("test.convenience", "enabled");

    assert.equal(await gate.isModuleEnabled("test.convenience"), true);
    assert.equal(await gate.assertModuleAccess("test.convenience", "public"), true);

    registry.recordState("test.convenience", "disabled");
    assert.equal(await gate.isModuleEnabled("test.convenience"), false);

    await assert.rejects(
      async () => {
        await gate.assertModuleAccess("test.convenience", "public");
      },
      (err: unknown) => {
        assert.ok(err instanceof ModuleGateError);
        assert.equal(err.code, "MODULE_NOT_ENABLED");
        assert.equal(err.decision.moduleKey, "test.convenience");
        return true;
      }
    );
  });

  // Test 32: Synchronous evaluation methods parity
  await t.test("32. Synchronous evaluation methods parity", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.sync-parity" }));
    registry.recordState("test.sync-parity", "enabled");

    const asyncMod = await gate.evaluateModuleAccess("test.sync-parity", "public");
    const syncMod = gate.evaluateModuleAccessSync("test.sync-parity", "public");
    assert.deepEqual(asyncMod, syncMod);

    const asyncRoute = await gate.evaluateRouteAccess("public", "/test/sync/parity/overview");
    const syncRoute = gate.evaluateRouteAccessSync("public", "/test/sync/parity/overview");
    assert.deepEqual(asyncRoute, syncRoute);
  });

  // Test 33: ModuleGateError instanciation
  await t.test("33. ModuleGateError instanciation", async () => {
    const decision = {
      allowed: false,
      code: "MODULE_NOT_REGISTERED" as const,
      moduleKey: "ghost.module",
    };
    const err = new ModuleGateError(decision);
    assert.equal(err.name, "ModuleGateError");
    assert.equal(err.code, "MODULE_NOT_REGISTERED");
    assert.equal(err.decision, decision);
    assert.ok(err.message.includes("ghost.module"));
  });

  // Test 34: Route on disabled surface -> SURFACE_NOT_ENABLED
  await t.test("34. Route on disabled surface -> SURFACE_NOT_ENABLED", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(
      createTestModule({
        moduleKey: "test.surf-route",
        surfaces: {
          api: { enabled: false, surfaces: [] },
          ui: { public: { enabled: false } },
        },
        routes: [{ surface: "public", path: "/route-on-closed-surf", requiresAuth: false }],
      })
    );
    registry.recordState("test.surf-route", "enabled");

    const decision = await gate.evaluateRouteAccess("public", "/route-on-closed-surf");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "SURFACE_NOT_ENABLED");
    assert.equal(decision.moduleKey, "test.surf-route");
    assert.equal(decision.path, "/route-on-closed-surf");
  });

  // Test 35: Multiple required dependencies where one is disabled
  await t.test("35. Multiple required dependencies where one is disabled", async () => {
    const registry = createRegistry();
    const resolver = new DependencyResolver(registry);
    const gate = new ModuleGate(registry, resolver);

    registry.register(createTestModule({ moduleKey: "test.mult-dep1" }));
    registry.register(createTestModule({ moduleKey: "test.mult-dep2" }));
    registry.register(
      createTestModule({
        moduleKey: "test.mult-main",
        dependencies: {
          required: [
            { moduleKey: "test.mult-dep1", versionRange: "^1.0.0" },
            { moduleKey: "test.mult-dep2", versionRange: "^1.0.0" },
          ],
          optional: [],
          conflicts: [],
        },
      })
    );

    registry.recordState("test.mult-dep1", "enabled");
    registry.recordState("test.mult-dep2", "disabled");
    registry.recordState("test.mult-main", "enabled");

    const decision = await gate.evaluateModuleAccess("test.mult-main");
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "REQUIRED_DEPENDENCY_NOT_ENABLED");
    assert.equal(decision.requiredDependencyKey, "test.mult-dep2");
  });
});
