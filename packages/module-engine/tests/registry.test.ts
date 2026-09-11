/**
 * @tmpr/module-engine - Module Registry Mandatory Tests
 * Testovací sada pro ověření chování Module Registry dle TMPR-NEWDEV-20260911-F1-003.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ModuleRegistry,
  ModuleRegistryError,
  deepFreeze,
  type IModule,
  type IModuleManifest
} from "../src/index.js";

/**
 * Pomocná továrna na platné moduly pro testy registru.
 * Používá výhradně syntetické / platformní moduleKeys (platform.auth, test.a apod.).
 */
function createTestModule(overrides?: Partial<IModuleManifest>): IModule {
  const manifest: IModuleManifest = {
    moduleKey: "platform.auth",
    name: "Platform Auth Module",
    description: "Autentizační a autorizační platformní modul",
    version: "1.0.0",
    compatibility: {
      synthesisCore: "^1.0.0"
    },
    dependencies: {
      required: [],
      optional: [],
      conflicts: []
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
      ui: { public: { enabled: true, routePrefix: "/auth" } }
    },
    routes: [
      { path: "/auth/login", surface: "public", requiresAuth: false }
    ],
    permissions: [
      {
        key: "auth.login",
        name: "Přihlášení",
        description: "Povolit přihlášení uživatele",
        defaultRoles: ["guest"]
      }
    ],
    capabilities: ["auth.standard"],
    dataOwnership: {
      tables: ["auth_users"],
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
    fallback: { enabled: false },
    ...overrides
  };

  return {
    manifest
  };
}

describe("TMPR-NEWDEV-20260911-F1-003: Module Registry", () => {
  // 1. validní modul se zaregistruje
  it("1. validní modul se zaregistruje", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule();

    registry.register(mod);

    assert.equal(registry.has("platform.auth"), true);
    assert.equal(registry.get("platform.auth"), mod);
    const record = registry.getRecord("platform.auth");
    assert.ok(record);
    assert.equal(record.moduleKey, "platform.auth");
    assert.equal(record.version, "1.0.0");
  });

  // 2. invalidní manifest se odmítne (INVALID_MANIFEST)
  it("2. invalidní manifest se odmítne (INVALID_MANIFEST)", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const invalidMod = {
      manifest: {
        moduleKey: "invalid_no_namespace", // Neplatný klíč (bez tečky)
        name: "Invalid",
        version: "invalid-semver"
      }
    } as unknown as IModule;

    assert.throws(
      () => registry.register(invalidMod),
      (err: unknown) => {
        assert.ok(err instanceof ModuleRegistryError);
        assert.equal(err.code, "INVALID_MANIFEST");
        return true;
      }
    );
  });

  // 3. duplicitní moduleKey se odmítne (DUPLICATE_MODULE_KEY)
  it("3. duplicitní moduleKey se odmítne (DUPLICATE_MODULE_KEY)", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod1 = createTestModule({ moduleKey: "test.duplicate", version: "1.0.0" });
    const mod2 = createTestModule({ moduleKey: "test.duplicate", version: "2.0.0" });

    registry.register(mod1);

    assert.throws(
      () => registry.register(mod2),
      (err: unknown) => {
        assert.ok(err instanceof ModuleRegistryError);
        assert.equal(err.code, "DUPLICATE_MODULE_KEY");
        assert.equal(err.moduleKey, "test.duplicate");
        return true;
      }
    );
  });

  // 4. get / list / has fungují deterministicky
  it("4. get / list / has fungují deterministicky", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const modA = createTestModule({
      moduleKey: "test.module-a",
      routes: [{ path: "/a", surface: "public", requiresAuth: false }]
    });
    const modB = createTestModule({
      moduleKey: "test.module-b",
      routes: [{ path: "/b", surface: "public", requiresAuth: false }]
    });

    assert.equal(registry.has("test.module-a"), false);
    assert.equal(registry.get("test.module-a"), undefined);
    assert.equal(registry.list().length, 0);
    assert.equal(registry.listRecords().length, 0);

    registry.register(modA);
    registry.register(modB);

    assert.equal(registry.has("test.module-a"), true);
    assert.equal(registry.has("test.module-b"), true);
    assert.equal(registry.has("test.unknown"), false);

    assert.equal(registry.get("test.module-a"), modA);
    assert.equal(registry.get("test.module-b"), modB);
    assert.equal(registry.get("test.unknown"), undefined);

    const list = registry.list();
    assert.equal(list.length, 2);
    assert.ok(list.includes(modA));
    assert.ok(list.includes(modB));

    const records = registry.listRecords();
    assert.equal(records.length, 2);
    assert.equal(records[0]?.moduleKey, "test.module-a");
    assert.equal(records[1]?.moduleKey, "test.module-b");
  });

  // 5. kompatibilní synthesisCore projde
  it("5. kompatibilní synthesisCore projde", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.5.2" });
    const mod = createTestModule({
      moduleKey: "test.core-compat",
      compatibility: { synthesisCore: "^1.0.0" }
    });

    assert.doesNotThrow(() => registry.register(mod));
    assert.equal(registry.has("test.core-compat"), true);
  });

  // 6. nekompatibilní synthesisCore selže (CORE_VERSION_INCOMPATIBLE)
  it("6. nekompatibilní synthesisCore selže (CORE_VERSION_INCOMPATIBLE)", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "2.0.0" });
    const mod = createTestModule({
      moduleKey: "test.core-incompat",
      compatibility: { synthesisCore: "^1.0.0" }
    });

    assert.throws(
      () => registry.register(mod),
      (err: unknown) => {
        assert.ok(err instanceof ModuleRegistryError);
        assert.equal(err.code, "CORE_VERSION_INCOMPATIBLE");
        assert.equal(err.moduleKey, "test.core-incompat");
        return true;
      }
    );
  });

  // 7. modul s compatibility.synthesisCms
  describe("7. modul s compatibility.synthesisCms", () => {
    it("7a. projde při kompatibilní CMS verzi", () => {
      const registry = new ModuleRegistry({
        synthesisCoreVersion: "1.0.0",
        synthesisCmsVersion: "1.2.0"
      });
      const mod = createTestModule({
        moduleKey: "test.cms-compat",
        compatibility: {
          synthesisCore: "^1.0.0",
          synthesisCms: "^1.0.0"
        }
      });

      assert.doesNotThrow(() => registry.register(mod));
      assert.equal(registry.has("test.cms-compat"), true);
    });

    it("7b. selže při nekompatibilní CMS verzi (CMS_VERSION_INCOMPATIBLE)", () => {
      const registry = new ModuleRegistry({
        synthesisCoreVersion: "1.0.0",
        synthesisCmsVersion: "2.0.0"
      });
      const mod = createTestModule({
        moduleKey: "test.cms-incompat",
        compatibility: {
          synthesisCore: "^1.0.0",
          synthesisCms: "^1.0.0"
        }
      });

      assert.throws(
        () => registry.register(mod),
        (err: unknown) => {
          assert.ok(err instanceof ModuleRegistryError);
          assert.equal(err.code, "CMS_VERSION_INCOMPATIBLE");
          assert.equal(err.moduleKey, "test.cms-incompat");
          return true;
        }
      );
    });

    it("7c. selže fail-closed pokud CMS runtime version chybí (CMS_VERSION_REQUIRED)", () => {
      const registry = new ModuleRegistry({
        synthesisCoreVersion: "1.0.0"
        // synthesisCmsVersion chybí
      });
      const mod = createTestModule({
        moduleKey: "test.cms-required",
        compatibility: {
          synthesisCore: "^1.0.0",
          synthesisCms: "^1.0.0"
        }
      });

      assert.throws(
        () => registry.register(mod),
        (err: unknown) => {
          assert.ok(err instanceof ModuleRegistryError);
          assert.equal(err.code, "CMS_VERSION_REQUIRED");
          assert.equal(err.moduleKey, "test.cms-required");
          return true;
        }
      );
    });
  });

  // 8. po register je state = uninstalled
  it("8. po register je state = uninstalled", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.lifecycle-init" });

    registry.register(mod);

    const record = registry.getRecord("test.lifecycle-init");
    assert.ok(record);
    assert.equal(record.state, "uninstalled");
  });

  // 9. recordState aktualizuje existující modul
  it("9. recordState aktualizuje existující modul", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.state-update" });

    registry.register(mod);
    assert.equal(registry.getRecord("test.state-update")?.state, "uninstalled");

    registry.recordState("test.state-update", "installed");
    assert.equal(registry.getRecord("test.state-update")?.state, "installed");

    registry.recordState("test.state-update", "enabled");
    assert.equal(registry.getRecord("test.state-update")?.state, "enabled");

    registry.recordState("test.state-update", "disabled");
    assert.equal(registry.getRecord("test.state-update")?.state, "disabled");

    registry.recordState("test.state-update", "failed");
    assert.equal(registry.getRecord("test.state-update")?.state, "failed");
  });

  // 10. recordState neexistujícího modulu selže (MODULE_NOT_REGISTERED)
  it("10. recordState neexistujícího modulu selže (MODULE_NOT_REGISTERED)", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });

    assert.throws(
      () => registry.recordState("test.non-existent", "enabled"),
      (err: unknown) => {
        assert.ok(err instanceof ModuleRegistryError);
        assert.equal(err.code, "MODULE_NOT_REGISTERED");
        assert.equal(err.moduleKey, "test.non-existent");
        return true;
      }
    );
  });

  // 11. route lookup vrací správného vlastníka
  it("11. route lookup vrací správného vlastníka (getRouteOwner)", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.route-owner",
      routes: [
        { path: "/kalkulacka", surface: "public", requiresAuth: false },
        { path: "/admin/kalkulacka", surface: "admin", requiresAuth: true }
      ]
    });

    registry.register(mod);

    assert.equal(registry.getRouteOwner("public", "/kalkulacka"), "test.route-owner");
    assert.equal(registry.getRouteOwner("admin", "/admin/kalkulacka"), "test.route-owner");
    assert.equal(registry.getRouteOwner("public", "/neexistujici"), undefined);
    assert.equal(registry.getRouteOwner("account", "/kalkulacka"), undefined);
  });

  // 12. konflikt: stejná surface + stejný path -> selže (ROUTE_CONFLICT)
  it("12. konflikt: stejná surface + stejný path -> selže (ROUTE_CONFLICT)", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod1 = createTestModule({
      moduleKey: "test.route-a",
      routes: [{ path: "/kalkulacka", surface: "public", requiresAuth: false }]
    });
    const mod2 = createTestModule({
      moduleKey: "test.route-b",
      routes: [{ path: "/kalkulacka", surface: "public", requiresAuth: false }]
    });

    registry.register(mod1);

    assert.throws(
      () => registry.register(mod2),
      (err: unknown) => {
        assert.ok(err instanceof ModuleRegistryError);
        assert.equal(err.code, "ROUTE_CONFLICT");
        assert.equal(err.moduleKey, "test.route-b");
        return true;
      }
    );

    // Ověření atomicity: původní vlastník zůstává nezměněn a mod2 není registrován
    assert.equal(registry.getRouteOwner("public", "/kalkulacka"), "test.route-a");
    assert.equal(registry.has("test.route-b"), false);
  });

  // 13. stejný path + jiná surface -> může projít
  it("13. stejný path + jiná surface -> může projít", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const modPublic = createTestModule({
      moduleKey: "test.surface-public",
      routes: [{ path: "/prehled", surface: "public", requiresAuth: false }]
    });
    const modAccount = createTestModule({
      moduleKey: "test.surface-account",
      routes: [{ path: "/prehled", surface: "account", requiresAuth: true }]
    });

    assert.doesNotThrow(() => registry.register(modPublic));
    assert.doesNotThrow(() => registry.register(modAccount));

    assert.equal(registry.getRouteOwner("public", "/prehled"), "test.surface-public");
    assert.equal(registry.getRouteOwner("account", "/prehled"), "test.surface-account");
  });

  // 14. modul s chybějící required module dependency se může REGISTROVAT
  it("14. modul s chybějící required module dependency se může REGISTROVAT", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const modWithMissingDep = createTestModule({
      moduleKey: "test.dependent-module",
      dependencies: {
        required: [
          {
            moduleKey: "platform.missing-service",
            versionRange: "^1.0.0",
            reason: "Vyžaduje běhovou službu, která zatím není v registru"
          }
        ],
        optional: [],
        conflicts: []
      }
    });

    // Dependency platform.missing-service v registru neexistuje
    assert.equal(registry.has("platform.missing-service"), false);

    // Registrace přesto MUSÍ projít (Dependency Resolver je navazující samostatný krok)
    assert.doesNotThrow(() => registry.register(modWithMissingDep));
    assert.equal(registry.has("test.dependent-module"), true);
  });
});

describe("TMPR-NEWDEV-20260911-F1-003-R01: Read-only State Hardening", () => {
  // 1. getRecord() vrací správný state
  it("1. getRecord() vrací správný state", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.hardening-get" });
    registry.register(mod);

    const record = registry.getRecord("test.hardening-get");
    assert.ok(record);
    assert.equal(record.state, "uninstalled");
  });

  // 2. pokus změnit state vráceného getRecord snapshotu nezmění interní state
  it("2. pokus změnit state vráceného getRecord snapshotu nezmění interní state", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.hardening-mutation" });
    registry.register(mod);

    const record = registry.getRecord("test.hardening-mutation");
    assert.ok(record);
    assert.equal(record.state, "uninstalled");

    // Pokus o přímou mutaci snapshotu
    try {
      (record as unknown as { state: string }).state = "enabled";
    } catch {
      // V striktním režimu Object.freeze vyvolá TypeError
    }

    // Interní stav registru MUSÍ zůstat nezměněn (uninstalled)
    const freshRecord = registry.getRecord("test.hardening-mutation");
    assert.ok(freshRecord);
    assert.equal(freshRecord.state, "uninstalled");
  });

  // 3. listRecords() neumožní změnit interní state mutací vráceného recordu
  it("3. listRecords() neumožní změnit interní state mutací vráceného recordu", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.hardening-list" });
    registry.register(mod);

    const records = registry.listRecords();
    assert.equal(records.length, 1);
    assert.equal(records[0]?.state, "uninstalled");

    // Pokus o mutaci prvku z listRecords
    try {
      (records[0] as unknown as { state: string }).state = "enabled";
    } catch {
      // V striktním režimu Object.freeze vyvolá TypeError
    }

    // Pokus o mutaci pole samotného (Object.freeze)
    assert.throws(() => {
      (records as unknown as Array<unknown>).push({} as any);
    }, TypeError);

    // Interní stav registru MUSÍ zůstat nezměněn
    assert.equal(registry.getRecord("test.hardening-list")?.state, "uninstalled");
  });

  // 4. recordState() stále správně změní interní state
  it("4. recordState() stále správně změní interní state", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.hardening-record-state" });
    registry.register(mod);

    assert.doesNotThrow(() => {
      registry.recordState("test.hardening-record-state", "installed");
    });
  });

  // 5. po recordState() nový getRecord() vrátí nový aktuální state
  it("5. po recordState() nový getRecord() vrátí nový aktuální state", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.hardening-lifecycle" });
    registry.register(mod);

    assert.equal(registry.getRecord("test.hardening-lifecycle")?.state, "uninstalled");

    registry.recordState("test.hardening-lifecycle", "installed");
    assert.equal(registry.getRecord("test.hardening-lifecycle")?.state, "installed");

    registry.recordState("test.hardening-lifecycle", "enabled");
    assert.equal(registry.getRecord("test.hardening-lifecycle")?.state, "enabled");

    registry.recordState("test.hardening-lifecycle", "disabled");
    assert.equal(registry.getRecord("test.hardening-lifecycle")?.state, "disabled");

    registry.recordState("test.hardening-lifecycle", "failed");
    assert.equal(registry.getRecord("test.hardening-lifecycle")?.state, "failed");
  });

  // 6. registry API nadále funguje: register/get/list/has/getRouteOwner
  it("6. registry API nadále funguje: register/get/list/has/getRouteOwner", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const modA = createTestModule({
      moduleKey: "test.module-a",
      routes: [{ path: "/a", surface: "public", requiresAuth: false }]
    });
    const modB = createTestModule({
      moduleKey: "test.module-b",
      routes: [{ path: "/b", surface: "admin", requiresAuth: true }]
    });

    registry.register(modA);
    registry.register(modB);

    assert.equal(registry.has("test.module-a"), true);
    assert.equal(registry.has("test.module-b"), true);
    assert.equal(registry.has("test.module-c"), false);

    assert.equal(registry.get("test.module-a"), modA);
    assert.equal(registry.get("test.module-b"), modB);
    assert.equal(registry.get("test.module-c"), undefined);

    const list = registry.list();
    assert.equal(list.length, 2);
    assert.ok(list.includes(modA));
    assert.ok(list.includes(modB));

    assert.equal(registry.getRouteOwner("public", "/a"), "test.module-a");
    assert.equal(registry.getRouteOwner("admin", "/b"), "test.module-b");
    assert.equal(registry.getRouteOwner("public", "/b"), undefined);
  });
});

// ============================================================================
// TMPR-NEWDEV-20260911-F1-003-R02: Deep Manifest Immutability Hardening
// ============================================================================

describe("TMPR-NEWDEV-20260911-F1-003-R02: Deep Manifest Immutability Hardening", () => {
  // 1. Object.isFrozen(record.manifest) === true
  it("1. Object.isFrozen(record.manifest) === true", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.freeze-root" });
    registry.register(mod);

    const record = registry.getRecord("test.freeze-root");
    assert.ok(record);
    assert.equal(Object.isFrozen(record.manifest), true);
  });

  // 2. Object.isFrozen(record.manifest.routes) === true
  it("2. Object.isFrozen(record.manifest.routes) === true", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.freeze-routes",
      routes: [{ path: "/login", surface: "public", requiresAuth: false }]
    });
    registry.register(mod);

    const record = registry.getRecord("test.freeze-routes");
    assert.ok(record);
    assert.equal(Object.isFrozen(record.manifest.routes), true);
    assert.equal(Object.isFrozen(record.manifest.routes[0]), true);
  });

  // 3. Object.isFrozen(record.manifest.dependencies) === true
  it("3. Object.isFrozen(record.manifest.dependencies) === true", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.freeze-deps" });
    registry.register(mod);

    const record = registry.getRecord("test.freeze-deps");
    assert.ok(record);
    assert.equal(Object.isFrozen(record.manifest.dependencies), true);
  });

  // 4. Object.isFrozen(record.manifest.dependencies.required) === true
  it("4. Object.isFrozen(record.manifest.dependencies.required) === true", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.freeze-deps-required",
      dependencies: {
        required: [{ moduleKey: "platform.auth", versionRange: "^1.0.0" }],
        optional: [],
        conflicts: []
      }
    });
    registry.register(mod);

    const record = registry.getRecord("test.freeze-deps-required");
    assert.ok(record);
    assert.equal(Object.isFrozen(record.manifest.dependencies.required), true);
    assert.equal(Object.isFrozen(record.manifest.dependencies.optional), true);
    assert.equal(Object.isFrozen(record.manifest.dependencies.conflicts), true);
    assert.equal(Object.isFrozen(record.manifest.dependencies.required[0]), true);
  });

  // 5. pokus (record.manifest.routes as any[]).push(...) selže / nezmění Registry manifest
  it("5. pokus (record.manifest.routes as any[]).push(...) selže / nezmění Registry manifest", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.routes-mutation-attempt",
      routes: [{ path: "/init", surface: "public", requiresAuth: false }]
    });
    registry.register(mod);

    const record = registry.getRecord("test.routes-mutation-attempt");
    assert.ok(record);

    assert.throws(() => {
      (record.manifest.routes as unknown as Array<unknown>).push({
        path: "/injected",
        surface: "public",
        requiresAuth: false
      });
    }, TypeError);

    // Počet a obsah rout musí zůstat přesně podle registrace
    assert.equal(record.manifest.routes.length, 1);
    assert.equal(record.manifest.routes[0]!.path, "/init");

    // Nový snapshot z registru musí mít rovněž původní stav
    const freshRecord = registry.getRecord("test.routes-mutation-attempt");
    assert.ok(freshRecord);
    assert.equal(freshRecord.manifest.routes.length, 1);
    assert.equal(freshRecord.manifest.routes[0]!.path, "/init");
  });

  // 6. pokus změnit nested property například (record.manifest.surfaces as any).api.enabled = false nezmění Registry data
  it("6. pokus změnit nested property například (record.manifest.surfaces as any).api.enabled = false nezmění Registry data", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.surfaces-mutation-attempt" });
    registry.register(mod);

    const record = registry.getRecord("test.surfaces-mutation-attempt");
    assert.ok(record);

    assert.throws(() => {
      (record.manifest.surfaces.api as unknown as { enabled: boolean }).enabled = false;
    }, TypeError);

    assert.equal(record.manifest.surfaces.api.enabled, true);

    const freshRecord = registry.getRecord("test.surfaces-mutation-attempt");
    assert.ok(freshRecord);
    assert.equal(freshRecord.manifest.surfaces.api.enabled, true);
  });

  // 7. pokus změnit (record.manifest.dependencies.required as any[]) nezmění Registry data
  it("7. pokus změnit (record.manifest.dependencies.required as any[]) nezmění Registry data", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.deps-mutation-attempt",
      dependencies: {
        required: [{ moduleKey: "platform.core", versionRange: "^1.0.0" }],
        optional: [],
        conflicts: []
      }
    });
    registry.register(mod);

    const record = registry.getRecord("test.deps-mutation-attempt");
    assert.ok(record);

    assert.throws(() => {
      (record.manifest.dependencies.required as unknown as Array<unknown>).push({
        moduleKey: "hacked.dep",
        versionRange: "^1.0.0"
      });
    }, TypeError);

    assert.throws(() => {
      (record.manifest.dependencies.required as unknown as Array<unknown>)[0] = {
        moduleKey: "mutated.dep",
        versionRange: "^1.0.0"
      };
    }, TypeError);

    assert.equal(record.manifest.dependencies.required.length, 1);
    assert.equal(record.manifest.dependencies.required[0]!.moduleKey, "platform.core");

    const freshRecord = registry.getRecord("test.deps-mutation-attempt");
    assert.ok(freshRecord);
    assert.equal(freshRecord.manifest.dependencies.required.length, 1);
    assert.equal(freshRecord.manifest.dependencies.required[0]!.moduleKey, "platform.core");
  });

  // 8. mutace původního module.manifest.routes PO registraci nezmění registry.getRecord(key).manifest.routes
  it("8. mutace původního module.manifest PO registraci nezmění autoritativní registry manifest", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.original-isolation",
      version: "1.0.0",
      routes: [{ path: "/original", surface: "public", requiresAuth: false }],
      dependencies: {
        required: [{ moduleKey: "platform.base", versionRange: "^1.0.0" }],
        optional: [],
        conflicts: []
      }
    });

    registry.register(mod);

    // Nyní zákeřně mutujeme původní objekt module.manifest, který byl předán do register()
    mod.manifest.version = "9.9.9";
    mod.manifest.routes.push({
      path: "/injected-route",
      surface: "public",
      requiresAuth: false
    });
    mod.manifest.dependencies.required.push({
      moduleKey: "injected.dependency",
      versionRange: "^1.0.0"
    });
    (mod.manifest.surfaces.api as { enabled: boolean }).enabled = false;

    // Autoritativní záznam v registru MUSÍ zůstat zcela izolován a nezměněn
    const record = registry.getRecord("test.original-isolation");
    assert.ok(record);
    assert.equal(record.manifest.version, "1.0.0");
    assert.equal(record.manifest.routes.length, 1);
    assert.equal(record.manifest.routes[0]!.path, "/original");
    assert.equal(record.manifest.dependencies.required.length, 1);
    assert.equal(record.manifest.dependencies.required[0]!.moduleKey, "platform.base");
    assert.equal(record.manifest.surfaces.api.enabled, true);

    // Zároveň původní runtime instance module zůstává neporušena pro lifecycle hooky
    assert.equal(record.module, mod);
  });

  // 9. getRecord() state ochrana z R01 dál PASS
  it("9. getRecord() state ochrana z R01 dál PASS", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.r01-state-protection" });
    registry.register(mod);

    const record = registry.getRecord("test.r01-state-protection");
    assert.ok(record);
    assert.equal(record.state, "uninstalled");

    // Pokus o přímou změnu state na snapshotu selže
    assert.throws(() => {
      (record as unknown as { state: string }).state = "enabled";
    }, TypeError);

    // Interní stav registru zůstává uninstalled
    assert.equal(registry.getRecord("test.r01-state-protection")?.state, "uninstalled");
  });

  // 10. listRecords() state ochrana z R01 dál PASS
  it("10. listRecords() state ochrana z R01 dál PASS", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.r01-list-state" });
    registry.register(mod);

    const records = registry.listRecords();
    assert.equal(records.length, 1);
    assert.equal(records[0]!.state, "uninstalled");

    assert.throws(() => {
      (records[0] as unknown as { state: string }).state = "enabled";
    }, TypeError);

    assert.throws(() => {
      (records as unknown as Array<unknown>).push({} as any);
    }, TypeError);

    assert.equal(registry.getRecord("test.r01-list-state")?.state, "uninstalled");
  });

  // 11. recordState() dál funguje
  it("11. recordState() dál funguje", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.r01-record-state" });
    registry.register(mod);

    assert.equal(registry.getRecord("test.r01-record-state")?.state, "uninstalled");

    registry.recordState("test.r01-record-state", "installed");
    assert.equal(registry.getRecord("test.r01-record-state")?.state, "installed");

    registry.recordState("test.r01-record-state", "enabled");
    assert.equal(registry.getRecord("test.r01-record-state")?.state, "enabled");

    // Manifest zůstává po změně stavu stále hluboce zmrazen
    const record = registry.getRecord("test.r01-record-state");
    assert.ok(record);
    assert.equal(Object.isFrozen(record.manifest), true);
    assert.equal(Object.isFrozen(record.manifest.routes), true);
  });

  // 12. route ownership dál funguje
  it("12. route ownership dál funguje", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.route-owner-check",
      routes: [
        { path: "/deep/auth/callback", surface: "public", requiresAuth: false },
        { path: "/deep/admin/settings", surface: "admin", requiresAuth: true }
      ]
    });
    registry.register(mod);

    assert.equal(
      registry.getRouteOwner("public", "/deep/auth/callback"),
      "test.route-owner-check"
    );
    assert.equal(
      registry.getRouteOwner("admin", "/deep/admin/settings"),
      "test.route-owner-check"
    );
    assert.equal(
      registry.getRouteOwner("public", "/nonexistent"),
      undefined
    );
  });

  // 13. komplexní hluboké zmrazení všech větví manifestu
  it("13. komplexní hluboké zmrazení všech větví manifestu", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({
      moduleKey: "test.all-sections-frozen",
      compatibility: { synthesisCore: "^1.0.0" },
      lifecycle: {
        supportedHooks: ["install", "enable"],
        requiresRestart: false,
        disableBehavior: { mode: "fail_closed", dataRetention: "retain" }
      },
      surfaces: {
        api: { enabled: true, surfaces: ["synapi_public"] },
        ui: { public: { enabled: true, routePrefix: "/test" } }
      },
      routes: [{ path: "/test", surface: "public", requiresAuth: false }],
      permissions: [
        { key: "perm.read", name: "Read", description: "Read permission", defaultRoles: ["user"] }
      ],
      capabilities: ["cap.a", "cap.b"],
      dataOwnership: {
        tables: ["test_table"],
        schemaPath: "database/schema/test.prisma",
        migrationsPath: "database/migrations",
        isolatedData: true
      },
      events: { emits: ["test.event"], subscribes: [] },
      jobs: [],
      cms: {
        contentPacks: [{ packKey: "pack1", path: "cms/packs/pack1" }],
        textKeys: ["key1"],
        help: { cs: { enabled: false, path: "help/cs" } }
      },
      healthCheck: { enabled: false, intervalSeconds: 60 },
      fallback: { enabled: false }
    });

    registry.register(mod);
    const record = registry.getRecord("test.all-sections-frozen");
    assert.ok(record);

    const m = record.manifest;
    assert.equal(Object.isFrozen(m), true);
    assert.equal(Object.isFrozen(m.compatibility), true);
    assert.equal(Object.isFrozen(m.lifecycle), true);
    assert.equal(Object.isFrozen(m.lifecycle.supportedHooks), true);
    assert.equal(Object.isFrozen(m.lifecycle.disableBehavior), true);
    assert.equal(Object.isFrozen(m.surfaces), true);
    assert.equal(Object.isFrozen(m.surfaces.api), true);
    assert.equal(Object.isFrozen(m.surfaces.api.surfaces), true);
    assert.equal(Object.isFrozen(m.permissions), true);
    assert.equal(Object.isFrozen(m.permissions[0]), true);
    assert.equal(Object.isFrozen(m.permissions[0]!.defaultRoles), true);
    assert.equal(Object.isFrozen(m.capabilities), true);
    assert.equal(Object.isFrozen(m.dataOwnership), true);
    assert.equal(Object.isFrozen(m.dataOwnership.tables), true);
    assert.equal(Object.isFrozen(m.events), true);
    assert.equal(Object.isFrozen(m.events.emits), true);
    assert.equal(Object.isFrozen(m.events.subscribes), true);
    assert.equal(Object.isFrozen(m.cms), true);
    assert.equal(Object.isFrozen(m.cms!.contentPacks), true);
    assert.equal(Object.isFrozen(m.cms!.contentPacks[0]), true);
    assert.equal(Object.isFrozen(m.cms!.textKeys), true);
    assert.equal(Object.isFrozen(m.healthCheck), true);
    assert.equal(Object.isFrozen(m.fallback), true);
  });

  // 14. unit testy pomocné funkce deepFreeze
  it("14. unit testy pomocné funkce deepFreeze", () => {
    // Primitiva a funkce zůstávají netknuté
    assert.equal(deepFreeze(42), 42);
    assert.equal(deepFreeze("text"), "text");
    assert.equal(deepFreeze(true), true);
    assert.equal(deepFreeze(null), null);
    assert.equal(deepFreeze(undefined), undefined);

    // Objekt s cyklickou referencí nezpůsobí zacyklení
    const cyclicObj: Record<string, unknown> = { a: 1 };
    cyclicObj.self = cyclicObj;
    assert.doesNotThrow(() => {
      deepFreeze(cyclicObj);
    });
    assert.equal(Object.isFrozen(cyclicObj), true);

    // Vnořené pole objektů
    const nested = { items: [{ id: "1" }, { id: "2" }] };
    deepFreeze(nested);
    assert.equal(Object.isFrozen(nested), true);
    assert.equal(Object.isFrozen(nested.items), true);
    assert.equal(Object.isFrozen(nested.items[0]), true);
    assert.equal(Object.isFrozen(nested.items[1]), true);
  });

  // 15. typecheck contract: statická typová kontrola zabraňuje přímé mutaci bez explicitního unsafe castu
  it("15. typecheck contract zabraňuje přímé mutaci bez explicitního unsafe castu", () => {
    const registry = new ModuleRegistry({ synthesisCoreVersion: "1.0.0" });
    const mod = createTestModule({ moduleKey: "test.typecheck-immutability" });
    registry.register(mod);

    const record = registry.getRecord("test.typecheck-immutability");
    assert.ok(record);

    // Ověření, že TypeScript striktně brání běžným mutacím (type-level)
    // a runtime Object.freeze vyvolá TypeError (runtime-level):

    assert.throws(() => {
      // @ts-expect-error - record.state je readonly
      record.state = "enabled";
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error - record.manifest.version je readonly
      record.manifest.version = "2.0.0";
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error - record.manifest.routes je ReadonlyArray bez push()
      record.manifest.routes.push({ path: "/hack", surface: "public", requiresAuth: false });
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error - record.manifest.dependencies.required je ReadonlyArray bez push()
      record.manifest.dependencies.required.push({ moduleKey: "another.dep", versionRange: "^1.0.0" });
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error - record.manifest.surfaces.api.enabled je readonly
      record.manifest.surfaces.api.enabled = false;
    }, TypeError);

    assert.equal(record.manifest.version, "1.0.0");
  });
});
