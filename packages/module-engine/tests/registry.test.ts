/**
 * @tmpr/module-engine - Module Registry Mandatory Tests
 * Testovací sada pro ověření chování Module Registry dle TMPR-NEWDEV-20260911-F1-003.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ModuleRegistry,
  ModuleRegistryError,
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
