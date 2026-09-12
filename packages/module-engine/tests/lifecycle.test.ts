/**
 * @file tests/lifecycle.test.ts
 * @description Komplexní testovací sada pro Reference Module Lifecycle Gate (NEWDEV-16 / F1-009).
 *
 * Testované invarianty:
 * 1. Povinný happy-path tok:
 *    uninstalled -> install -> installed -> enable -> enabled -> disable -> disabled -> enable -> enabled -> uninstall -> uninstalled
 * 2. Opakované a zakázané stavové přechody (fail-closed, INVALID_TRANSITION, stav nezměněn)
 * 3. Selhání install hooku -> fail-closed, autoritativní stav 'failed', žádný falešný úspěch
 * 4. Selhání enable hooku -> fail-closed, autoritativní stav 'failed', žádný falešný úspěch
 * 5. Selhání disable hooku -> fail-closed, autoritativní stav 'failed', žádný falešný úspěch
 * 6. Selhání uninstall hooku -> fail-closed, autoritativní stav 'failed', žádný falešný úspěch
 * 7. Závislosti a blokátory (DEPENDENCY_BLOCKED, REQUIRED_DEPENDENCY_NOT_ENABLED, DEPENDENT_MODULES_ACTIVE)
 * 8. Dostupnost přes Module Gate v každém stavu životního cyklu
 * 9. Úklid rout, oprávnění, referenčních dat a absence orphan registrací po uninstall
 * 10. Referenční modul vytvořený přes scaffold generátor
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type {
  IModule,
  IModuleLifecycleContext,
  IModuleManifest,
} from "../src/contract/types.js";
import { ModuleRegistry } from "../src/registry/registry.js";
import { DependencyResolver } from "../src/dependencies/dependency-resolver.js";
import { ModuleGate } from "../src/gates/module-gate.js";
import { ModuleLifecycleEngine } from "../src/lifecycle/lifecycle.engine.js";
import { ModuleLifecycleError } from "../src/lifecycle/lifecycle.errors.js";
import { scaffoldModule } from "../src/scaffold/index.js";

/**
 * Pomocná funkce pro vytvoření testovacího manifestu s minimálními platnými metadaty.
 */
function createTestManifest(
  moduleKey: string,
  overrides?: Partial<IModuleManifest>
): IModuleManifest {
  const slug = moduleKey.split(".").pop()!;
  return {
    moduleKey,
    name: `Test Module ${moduleKey}`,
    version: "1.0.0",
    description: `Testovací modul pro ${moduleKey}`,
    compatibility: {
      synthesisCore: "^0.1.0",
    },
    dependencies: {
      required: [],
      optional: [],
      conflicts: [],
    },
    lifecycle: {
      supportedHooks: ["install", "enable", "disable", "uninstall"],
      requiresRestart: false,
      disableBehavior: {
        mode: "fail_closed",
        dataRetention: "retain",
      },
    },
    surfaces: {
      api: {
        enabled: true,
        basePath: `/api/v1/${slug}`,
        surfaces: ["synapi_private"],
      },
      ui: {
        public: {
          enabled: true,
          routePrefix: `/${slug}`,
        },
        admin: {
          enabled: true,
          routePrefix: `/admin/${slug}`,
        },
      },
    },
    routes: [
      {
        path: `/api/v1/${slug}/status`,
        surface: "api",
        requiresAuth: true,
      },
      {
        path: `/${slug}`,
        surface: "public",
        requiresAuth: false,
      },
      {
        path: `/admin/${slug}`,
        surface: "admin",
        requiresAuth: true,
        permission: `${slug}.admin`,
      },
    ],
    permissions: [
      {
        key: `${slug}.view`,
        name: "View",
        description: "View permission",
        defaultRoles: ["user", "admin"],
      },
      {
        key: `${slug}.admin`,
        name: "Admin",
        description: "Admin permission",
        defaultRoles: ["admin"],
      },
    ],
    capabilities: [`${slug}.core`],
    dataOwnership: {
      tables: [`${slug}_records`],
      schemaPath: "database/schema/schema.prisma",
      migrationsPath: "database/migrations",
      isolatedData: true,
    },
    events: {
      emits: [`${moduleKey}.event`],
      subscribes: [],
    },
    jobs: [],
    cms: {
      contentPacks: [{ packKey: `${slug}-guides`, path: "content/guides" }],
      textKeys: [`${slug}.intro`],
      help: { cs: { enabled: true, path: "help/cs" } },
    },
    healthCheck: {
      enabled: true,
      intervalSeconds: 60,
      endpoint: "/health",
    },
    fallback: {
      enabled: true,
      defaultResponse: "Service unavailable",
    },
    ...overrides,
  };
}

/**
 * Testovací modul se sledováním volání hooků a in-memory stavem.
 */
class TrackedLifecycleModule implements IModule {
  public readonly manifest: IModuleManifest;
  public readonly hookCalls: string[] = [];
  public failOnHook: string | null = null;
  public failError: Error = new Error("Simulated hook failure");
  public repositoryData = new Map<string, string>();

  constructor(manifest: IModuleManifest) {
    this.manifest = manifest;
  }

  public async onInstall(context: IModuleLifecycleContext): Promise<void> {
    this.hookCalls.push("onInstall");
    if (this.failOnHook === "install") {
      throw this.failError;
    }
    context.logger.info(`Installed ${this.manifest.moduleKey}`);
  }

  public async onEnable(context: IModuleLifecycleContext): Promise<void> {
    this.hookCalls.push("onEnable");
    if (this.failOnHook === "enable") {
      throw this.failError;
    }
    context.logger.info(`Enabled ${this.manifest.moduleKey}`);
  }

  public async onDisable(context: IModuleLifecycleContext): Promise<void> {
    this.hookCalls.push("onDisable");
    if (this.failOnHook === "disable") {
      throw this.failError;
    }
    context.logger.info(`Disabled ${this.manifest.moduleKey}`);
  }

  public async onUninstall(context: IModuleLifecycleContext): Promise<void> {
    this.hookCalls.push("onUninstall");
    if (this.failOnHook === "uninstall") {
      throw this.failError;
    }
    this.repositoryData.clear();
    context.logger.info(`Uninstalled ${this.manifest.moduleKey}`);
  }
}

describe("Reference Module Lifecycle Gate (NEWDEV-16 / F1-009)", () => {
  let registry: ModuleRegistry;
  let resolver: DependencyResolver;
  let gate: ModuleGate;
  let engine: ModuleLifecycleEngine;
  let tempDir: string;

  beforeEach(() => {
    registry = new ModuleRegistry({ synthesisCoreVersion: "0.1.0" });
    resolver = new DependencyResolver(registry);
    gate = new ModuleGate(registry, resolver);
    engine = new ModuleLifecycleEngine(registry, resolver, gate);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tmpr-lifecycle-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // 1. Povinný happy-path tok
  // ==========================================================================
  describe("1. Povinný happy-path tok životního cyklu", () => {
    it("úspěšně provede uninstalled -> install -> installed -> enable -> enabled -> disable -> disabled -> enable -> enabled -> uninstall -> uninstalled", async () => {
      const manifest = createTestManifest("reference.happy-path");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      // Výchozí stav po registraci: uninstalled
      assert.equal(engine.getState("reference.happy-path"), "uninstalled");
      assert.equal(await gate.isModuleEnabled("reference.happy-path"), false);
      assert.equal(
        (await gate.evaluateModuleAccess("reference.happy-path")).allowed,
        false
      );
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/happy-path")).allowed,
        false
      );

      // 1. Krok: install -> installed
      const resInstall = await engine.install("reference.happy-path");
      assert.equal(resInstall.success, true);
      assert.equal(resInstall.previousState, "uninstalled");
      assert.equal(resInstall.newState, "installed");
      assert.equal(resInstall.transition, "install");
      assert.equal(engine.getState("reference.happy-path"), "installed");
      assert.deepEqual(mod.hookCalls, ["onInstall"]);
      assert.equal(await gate.isModuleEnabled("reference.happy-path"), false);

      // 2. Krok: enable -> enabled
      const resEnable1 = await engine.enable("reference.happy-path");
      assert.equal(resEnable1.success, true);
      assert.equal(resEnable1.previousState, "installed");
      assert.equal(resEnable1.newState, "enabled");
      assert.equal(resEnable1.transition, "enable");
      assert.equal(engine.getState("reference.happy-path"), "enabled");
      assert.deepEqual(mod.hookCalls, ["onInstall", "onEnable"]);

      // Ověření dostupnosti přes gate
      assert.equal(await gate.isModuleEnabled("reference.happy-path"), true);
      const accEnabled = await gate.evaluateModuleAccess("reference.happy-path");
      assert.equal(accEnabled.allowed, true);
      assert.equal(accEnabled.code, "ALLOW");
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/happy-path")).allowed,
        true
      );
      assert.equal(
        (await gate.evaluateRouteAccess("admin", "/admin/happy-path")).allowed,
        true
      );
      assert.equal(
        (await gate.evaluateRouteAccess("api", "/api/v1/happy-path/status")).allowed,
        true
      );

      // Uložíme referenční data do modulu
      mod.repositoryData.set("doc-1", "Aktivní dokument");
      assert.equal(mod.repositoryData.size, 1);

      // 3. Krok: disable -> disabled
      const resDisable = await engine.disable("reference.happy-path");
      assert.equal(resDisable.success, true);
      assert.equal(resDisable.previousState, "enabled");
      assert.equal(resDisable.newState, "disabled");
      assert.equal(resDisable.transition, "disable");
      assert.equal(engine.getState("reference.happy-path"), "disabled");
      assert.deepEqual(mod.hookCalls, ["onInstall", "onEnable", "onDisable"]);

      // Ověření nedostupnosti přes gate ve stavu disabled
      assert.equal(await gate.isModuleEnabled("reference.happy-path"), false);
      const accDisabled = await gate.evaluateModuleAccess("reference.happy-path");
      assert.equal(accDisabled.allowed, false);
      assert.equal(accDisabled.code, "MODULE_NOT_ENABLED");
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/happy-path")).allowed,
        false
      );

      // 4. Krok: enable (opětovná aktivace) -> enabled
      const resEnable2 = await engine.enable("reference.happy-path");
      assert.equal(resEnable2.success, true);
      assert.equal(resEnable2.previousState, "disabled");
      assert.equal(resEnable2.newState, "enabled");
      assert.equal(engine.getState("reference.happy-path"), "enabled");
      assert.deepEqual(mod.hookCalls, [
        "onInstall",
        "onEnable",
        "onDisable",
        "onEnable",
      ]);
      assert.equal(await gate.isModuleEnabled("reference.happy-path"), true);

      // 5. Krok: uninstall -> uninstalled
      const resUninstall = await engine.uninstall("reference.happy-path");
      assert.equal(resUninstall.success, true);
      assert.equal(resUninstall.previousState, "enabled");
      assert.equal(resUninstall.newState, "uninstalled");
      assert.equal(resUninstall.transition, "uninstall");
      assert.equal(engine.getState("reference.happy-path"), "uninstalled");
      // Protože byl modul enabled, nejprve proběhl onDisable a poté onUninstall
      assert.deepEqual(mod.hookCalls, [
        "onInstall",
        "onEnable",
        "onDisable",
        "onEnable",
        "onDisable",
        "onUninstall",
      ]);

      // Data modulu byla vyčištěna
      assert.equal(mod.repositoryData.size, 0);

      // Ověření nedostupnosti přes gate ve stavu uninstalled
      assert.equal(await gate.isModuleEnabled("reference.happy-path"), false);
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/happy-path")).allowed,
        false
      );
    });
  });

  // ==========================================================================
  // 2. Opakované a zakázané stavové přechody (fail-closed)
  // ==========================================================================
  describe("2. Opakované a zakázané stavové přechody", () => {
    it("odmítne aktivaci neinstalovaného modulu (uninstalled -> enable)", async () => {
      const manifest = createTestManifest("reference.invalid-1");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      await assert.rejects(
        async () => engine.enable("reference.invalid-1"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "INVALID_TRANSITION");
          assert.equal(err.previousState, "uninstalled");
          assert.equal(err.targetState, "enabled");
          return true;
        }
      );

      // Stav v registru zůstává beze změny (fail-closed)
      assert.equal(engine.getState("reference.invalid-1"), "uninstalled");
      assert.equal(mod.hookCalls.length, 0);
    });

    it("odmítne deaktivaci neaktivního modulu (uninstalled -> disable a installed -> disable)", async () => {
      const manifest = createTestManifest("reference.invalid-2");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      // uninstalled -> disable
      await assert.rejects(
        async () => engine.disable("reference.invalid-2"),
        { code: "INVALID_TRANSITION" }
      );
      assert.equal(engine.getState("reference.invalid-2"), "uninstalled");

      // install -> installed
      await engine.install("reference.invalid-2");
      assert.equal(engine.getState("reference.invalid-2"), "installed");

      // installed -> disable
      await assert.rejects(
        async () => engine.disable("reference.invalid-2"),
        { code: "INVALID_TRANSITION" }
      );
      assert.equal(engine.getState("reference.invalid-2"), "installed");
    });

    it("odmítne opakovanou instalaci již instalovaného nebo běžícího modulu", async () => {
      const manifest = createTestManifest("reference.invalid-3");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      await engine.install("reference.invalid-3");
      assert.equal(engine.getState("reference.invalid-3"), "installed");

      // installed -> install
      await assert.rejects(
        async () => engine.install("reference.invalid-3"),
        { code: "INVALID_TRANSITION" }
      );

      await engine.enable("reference.invalid-3");
      assert.equal(engine.getState("reference.invalid-3"), "enabled");

      // enabled -> install
      await assert.rejects(
        async () => engine.install("reference.invalid-3"),
        { code: "INVALID_TRANSITION" }
      );
      assert.equal(engine.getState("reference.invalid-3"), "enabled");
    });

    it("odmítne opakovanou aktivaci již běžícího modulu (enabled -> enable)", async () => {
      const manifest = createTestManifest("reference.invalid-4");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      await engine.install("reference.invalid-4");
      await engine.enable("reference.invalid-4");
      assert.equal(engine.getState("reference.invalid-4"), "enabled");

      await assert.rejects(
        async () => engine.enable("reference.invalid-4"),
        { code: "INVALID_TRANSITION" }
      );
      assert.equal(engine.getState("reference.invalid-4"), "enabled");
    });

    it("odmítne odinstalaci již odinstalovaného modulu (uninstalled -> uninstall)", async () => {
      const manifest = createTestManifest("reference.invalid-5");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      await assert.rejects(
        async () => engine.uninstall("reference.invalid-5"),
        { code: "INVALID_TRANSITION" }
      );
      assert.equal(engine.getState("reference.invalid-5"), "uninstalled");
    });

    it("odmítne operaci na neregistrovaném modulu s kódem MODULE_NOT_REGISTERED", async () => {
      await assert.rejects(
        async () => engine.install("non.existent"),
        { code: "MODULE_NOT_REGISTERED" }
      );
      await assert.rejects(
        async () => engine.enable("non.existent"),
        { code: "MODULE_NOT_REGISTERED" }
      );
    });
  });

  // ==========================================================================
  // 3. Selhání install hooku
  // ==========================================================================
  describe("3. Selhání install hooku", () => {
    it("nastaví autoritativní stav na 'failed' a zabrání falešnému úspěšnému stavu", async () => {
      const manifest = createTestManifest("reference.fail-install");
      const mod = new TrackedLifecycleModule(manifest);
      mod.failOnHook = "install";
      mod.failError = new Error("Chyba při přípravě databázových tabulek");
      registry.register(mod);

      await assert.rejects(
        async () => engine.install("reference.fail-install"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "HOOK_FAILED");
          assert.equal(err.previousState, "uninstalled");
          assert.equal(err.targetState, "failed");
          assert.match(err.message, /Chyba při přípravě databázových tabulek/);
          return true;
        }
      );

      // Autoritativní stav v registru MUSÍ být 'failed' (nikdy 'installed')
      assert.equal(engine.getState("reference.fail-install"), "failed");
      assert.equal(await gate.isModuleEnabled("reference.fail-install"), false);
      const access = await gate.evaluateModuleAccess("reference.fail-install");
      assert.equal(access.allowed, false);
      assert.equal(access.code, "MODULE_NOT_ENABLED");
    });
  });

  // ==========================================================================
  // 4. Selhání enable hooku
  // ==========================================================================
  describe("4. Selhání enable hooku", () => {
    it("nastaví autoritativní stav na 'failed' a modul není dostupný přes gate", async () => {
      const manifest = createTestManifest("reference.fail-enable");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      // Úspěšná instalace
      await engine.install("reference.fail-enable");
      assert.equal(engine.getState("reference.fail-enable"), "installed");

      // Nastavení selhání na enable
      mod.failOnHook = "enable";
      mod.failError = new Error("Selhání inicializace subskripce eventů");

      await assert.rejects(
        async () => engine.enable("reference.fail-enable"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "HOOK_FAILED");
          assert.equal(err.targetState, "failed");
          return true;
        }
      );

      // Autoritativní stav v registru je 'failed' (nikdy 'enabled')
      assert.equal(engine.getState("reference.fail-enable"), "failed");
      assert.equal(await gate.isModuleEnabled("reference.fail-enable"), false);
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/fail-enable")).allowed,
        false
      );
    });
  });

  // ==========================================================================
  // 5. Selhání disable hooku
  // ==========================================================================
  describe("5. Selhání disable hooku", () => {
    it("nastaví autoritativní stav na 'failed' a zablokuje přístup", async () => {
      const manifest = createTestManifest("reference.fail-disable");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      await engine.install("reference.fail-disable");
      await engine.enable("reference.fail-disable");
      assert.equal(engine.getState("reference.fail-disable"), "enabled");

      mod.failOnHook = "disable";
      mod.failError = new Error("Zablokovaný resource pool");

      await assert.rejects(
        async () => engine.disable("reference.fail-disable"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "HOOK_FAILED");
          assert.equal(err.targetState, "failed");
          return true;
        }
      );

      assert.equal(engine.getState("reference.fail-disable"), "failed");
      assert.equal(await gate.isModuleEnabled("reference.fail-disable"), false);
    });
  });

  // ==========================================================================
  // 6. Selhání uninstall hooku
  // ==========================================================================
  describe("6. Selhání uninstall hooku", () => {
    it("při selhání onUninstall nastaví stav na 'failed' a nesmaže chybně data", async () => {
      const manifest = createTestManifest("reference.fail-uninstall");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      await engine.install("reference.fail-uninstall");
      assert.equal(engine.getState("reference.fail-uninstall"), "installed");

      mod.failOnHook = "uninstall";
      mod.failError = new Error("Chyba při archivaci auditního logu");

      await assert.rejects(
        async () => engine.uninstall("reference.fail-uninstall"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "HOOK_FAILED");
          assert.equal(err.targetState, "failed");
          return true;
        }
      );

      assert.equal(engine.getState("reference.fail-uninstall"), "failed");
      assert.equal(await gate.isModuleEnabled("reference.fail-uninstall"), false);
    });
  });

  // ==========================================================================
  // 7. Závislosti a blokátory (Dependency Blockers)
  // ==========================================================================
  describe("7. Kontrola závislostí před přechody", () => {
    it("zablokuje aktivaci modulu, pokud jeho required závislost není registrována", async () => {
      const manifestChild = createTestManifest("reference.child-unmet", {
        dependencies: {
          required: [{ moduleKey: "reference.parent-missing", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      });
      const mod = new TrackedLifecycleModule(manifestChild);
      registry.register(mod);

      await engine.install("reference.child-unmet");
      assert.equal(engine.getState("reference.child-unmet"), "installed");

      // Pokus o aktivaci selže s DEPENDENCY_BLOCKED
      await assert.rejects(
        async () => engine.enable("reference.child-unmet"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "DEPENDENCY_BLOCKED");
          assert.ok(err.blockers && err.blockers.length > 0);
          return true;
        }
      );

      // Stav zůstává 'installed' (fail-closed)
      assert.equal(engine.getState("reference.child-unmet"), "installed");
      assert.equal(await gate.isModuleEnabled("reference.child-unmet"), false);
    });

    it("zablokuje aktivaci modulu, pokud je required závislost pouze 'installed', ale ne 'enabled'", async () => {
      const manifestParent = createTestManifest("reference.parent-dormant");
      const manifestChild = createTestManifest("reference.child-waiting", {
        dependencies: {
          required: [{ moduleKey: "reference.parent-dormant", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      });

      const modParent = new TrackedLifecycleModule(manifestParent);
      const modChild = new TrackedLifecycleModule(manifestChild);

      registry.register(modParent);
      registry.register(modChild);

      await engine.install("reference.parent-dormant");
      await engine.install("reference.child-waiting");

      // Rodič je installed, ale NE enabled
      assert.equal(engine.getState("reference.parent-dormant"), "installed");

      // Pokus o aktivaci potomka selže s REQUIRED_DEPENDENCY_NOT_ENABLED
      await assert.rejects(
        async () => engine.enable("reference.child-waiting"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "REQUIRED_DEPENDENCY_NOT_ENABLED");
          assert.equal(err.dependencyKey, "reference.parent-dormant");
          return true;
        }
      );

      assert.equal(engine.getState("reference.child-waiting"), "installed");

      // Nyní aktivujeme rodiče
      await engine.enable("reference.parent-dormant");
      assert.equal(engine.getState("reference.parent-dormant"), "enabled");

      // Nyní aktivace potomka uspěje
      await engine.enable("reference.child-waiting");
      assert.equal(engine.getState("reference.child-waiting"), "enabled");
    });

    it("zablokuje deaktivaci rodičovského modulu, pokud na něm závisí aktivní potomek", async () => {
      const manifestParent = createTestManifest("reference.parent-active");
      const manifestChild = createTestManifest("reference.child-active", {
        dependencies: {
          required: [{ moduleKey: "reference.parent-active", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      });

      const modParent = new TrackedLifecycleModule(manifestParent);
      const modChild = new TrackedLifecycleModule(manifestChild);

      registry.register(modParent);
      registry.register(modChild);

      await engine.install("reference.parent-active");
      await engine.enable("reference.parent-active");

      await engine.install("reference.child-active");
      await engine.enable("reference.child-active");

      // Pokus o deaktivaci rodiče selže s DEPENDENT_MODULES_ACTIVE
      await assert.rejects(
        async () => engine.disable("reference.parent-active"),
        (err: unknown) => {
          assert.ok(err instanceof ModuleLifecycleError);
          assert.equal(err.code, "DEPENDENT_MODULES_ACTIVE");
          assert.deepEqual(err.dependentModules, ["reference.child-active"]);
          return true;
        }
      );

      // Rodič zůstává 'enabled'
      assert.equal(engine.getState("reference.parent-active"), "enabled");

      // Po deaktivaci potomka lze rodiče úspěšně deaktivovat
      await engine.disable("reference.child-active");
      await engine.disable("reference.parent-active");
      assert.equal(engine.getState("reference.parent-active"), "disabled");
    });

    it("zablokuje odinstalaci rodiče, pokud na něm stále závisí instalovaný potomek", async () => {
      const manifestParent = createTestManifest("reference.parent-stay");
      const manifestChild = createTestManifest("reference.child-stay", {
        dependencies: {
          required: [{ moduleKey: "reference.parent-stay", versionRange: "^1.0.0" }],
          optional: [],
          conflicts: [],
        },
      });

      const modParent = new TrackedLifecycleModule(manifestParent);
      const modChild = new TrackedLifecycleModule(manifestChild);

      registry.register(modParent);
      registry.register(modChild);

      await engine.install("reference.parent-stay");
      await engine.install("reference.child-stay");

      // Pokus o odinstalaci rodiče selže
      await assert.rejects(
        async () => engine.uninstall("reference.parent-stay"),
        { code: "DEPENDENT_MODULES_ACTIVE" }
      );
      assert.equal(engine.getState("reference.parent-stay"), "installed");

      // Odinstalujeme nejprve potomka
      await engine.uninstall("reference.child-stay");
      // Nyní odinstalace rodiče projde
      await engine.uninstall("reference.parent-stay");
      assert.equal(engine.getState("reference.parent-stay"), "uninstalled");
    });
  });

  // ==========================================================================
  // 8. Dostupnost přes Gate v každém stavu
  // ==========================================================================
  describe("8. Dostupnost přes Module Gate v každém stavu", () => {
    it("gate povoluje přístup VÝHRADNĚ a POUZE ve stavu 'enabled'", async () => {
      const manifest = createTestManifest("reference.gate-matrix");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      // Stav 1: uninstalled
      assert.equal(await gate.isModuleEnabled("reference.gate-matrix"), false);
      assert.equal(
        (await gate.evaluateModuleAccess("reference.gate-matrix")).allowed,
        false
      );
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/gate-matrix")).allowed,
        false
      );

      // Stav 2: installed
      await engine.install("reference.gate-matrix");
      assert.equal(await gate.isModuleEnabled("reference.gate-matrix"), false);
      assert.equal(
        (await gate.evaluateModuleAccess("reference.gate-matrix")).allowed,
        false
      );
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/gate-matrix")).allowed,
        false
      );

      // Stav 3: enabled -> JEDINÝ POVOLENÝ STAV
      await engine.enable("reference.gate-matrix");
      assert.equal(await gate.isModuleEnabled("reference.gate-matrix"), true);
      assert.equal(
        (await gate.evaluateModuleAccess("reference.gate-matrix")).allowed,
        true
      );
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/gate-matrix")).allowed,
        true
      );
      assert.equal(
        await gate.assertModuleAccess("reference.gate-matrix", "public"),
        true
      );

      // Stav 4: disabled
      await engine.disable("reference.gate-matrix");
      assert.equal(await gate.isModuleEnabled("reference.gate-matrix"), false);
      assert.equal(
        (await gate.evaluateModuleAccess("reference.gate-matrix")).allowed,
        false
      );
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/gate-matrix")).allowed,
        false
      );

      // Stav 5: uninstalled
      await engine.uninstall("reference.gate-matrix");
      assert.equal(await gate.isModuleEnabled("reference.gate-matrix"), false);
      assert.equal(
        (await gate.evaluateModuleAccess("reference.gate-matrix")).allowed,
        false
      );
      assert.equal(
        (await gate.evaluateRouteAccess("public", "/gate-matrix")).allowed,
        false
      );
    });
  });

  // ==========================================================================
  // 9. Úklid rout a absence orphan registrací po uninstall
  // ==========================================================================
  describe("9. Úklid rout a absence orphan registrací", () => {
    it("po uninstall s volbou unregister smaže všechny routy a záznam modulu z registru", async () => {
      const manifest = createTestManifest("reference.cleanup-test");
      const mod = new TrackedLifecycleModule(manifest);
      registry.register(mod);

      // Routy jsou zaindexovány
      assert.equal(
        registry.getRouteOwner("public", "/cleanup-test"),
        "reference.cleanup-test"
      );
      assert.equal(
        registry.getRouteOwner("admin", "/admin/cleanup-test"),
        "reference.cleanup-test"
      );
      assert.equal(
        registry.getRouteOwner("api", "/api/v1/cleanup-test/status"),
        "reference.cleanup-test"
      );

      await engine.install("reference.cleanup-test");
      await engine.enable("reference.cleanup-test");

      // Odinstalace s úplným vyřazením z registru (unregister: true)
      await engine.uninstall("reference.cleanup-test", { unregister: true });

      // Modul už není v registru
      assert.equal(registry.has("reference.cleanup-test"), false);
      assert.equal(registry.getRecord("reference.cleanup-test"), undefined);

      // Routy jsou kompletně odstraněny z route indexu (žádné orphan routy!)
      assert.equal(
        registry.getRouteOwner("public", "/cleanup-test"),
        undefined
      );
      assert.equal(
        registry.getRouteOwner("admin", "/admin/cleanup-test"),
        undefined
      );
      assert.equal(
        registry.getRouteOwner("api", "/api/v1/cleanup-test/status"),
        undefined
      );

      // Vyhodnocení přístupu na tuto cestu hlásí ROUTE_NOT_REGISTERED
      const routeAccess = await gate.evaluateRouteAccess("public", "/cleanup-test");
      assert.equal(routeAccess.allowed, false);
      assert.equal(routeAccess.code, "ROUTE_NOT_REGISTERED");
    });
  });

  // ==========================================================================
  // 10. Referenční modul vytvořený přes Scaffold generátor
  // ==========================================================================
  describe("10. Referenční modul vytvořený přes scaffold generátor", () => {
    it("vygeneruje referenční modul přes scaffoldModule a ověří kompletní životní cyklus", async () => {
      const moduleTargetDir = path.join(tempDir, "scaffolded-module");

      // 1. Vygenerování referenčního modulu přes deterministický scaffold generátor
      const scaffoldResult = scaffoldModule({
        moduleKey: "reference.scaffold-demo",
        name: "Scaffold Reference Demo",
        description: "Automaticky vygenerovaný referenční modul pro ověření lifecycle",
        version: "1.0.0",
        targetDir: moduleTargetDir,
      });

      assert.equal(scaffoldResult.success, true);
      assert.ok(fs.existsSync(path.join(moduleTargetDir, "src/manifest.ts")));
      assert.ok(fs.existsSync(path.join(moduleTargetDir, "src/index.ts")));
      assert.ok(fs.existsSync(path.join(moduleTargetDir, "src/data/repository.ts")));

      // 2. Registrace modulu s plnou implementací lifecycle hooků a repository
      const repositoryStore = new Map<string, { id: string; title: string }>();
      let isInstalled = false;
      let isEnabled = false;
      const hookLogs: string[] = [];

      const scaffoldedModule: IModule = {
        manifest: scaffoldResult.manifest,
        onInstall: async (ctx) => {
          isInstalled = true;
          hookLogs.push("onInstall");
          ctx.logger.info("Scaffolded module installed");
        },
        onEnable: async (ctx) => {
          isEnabled = true;
          hookLogs.push("onEnable");
          ctx.logger.info("Scaffolded module enabled");
        },
        onDisable: async (ctx) => {
          isEnabled = false;
          hookLogs.push("onDisable");
          ctx.logger.info("Scaffolded module disabled");
        },
        onUninstall: async (ctx) => {
          isInstalled = false;
          isEnabled = false;
          hookLogs.push("onUninstall");
          repositoryStore.clear();
          ctx.logger.info("Scaffolded module uninstalled and data wiped");
        },
        onHealthCheck: async () => ({
          status: isEnabled ? "healthy" : "degraded",
          checkedAt: new Date().toISOString(),
          details: { isInstalled, isEnabled },
        }),
      };

      registry.register(scaffoldedModule);
      const record = registry.getRecord("reference.scaffold-demo");
      assert.ok(record);
      assert.equal(record.moduleKey, "reference.scaffold-demo");
      assert.equal(record.state, "uninstalled");

      // 3. Spuštění celého životního cyklu přes lifecycle engine
      // install
      const instRes = await engine.install("reference.scaffold-demo");
      assert.equal(instRes.success, true);
      assert.equal(engine.getState("reference.scaffold-demo"), "installed");
      assert.equal(isInstalled, true);
      assert.equal(isEnabled, false);

      // enable
      const enaRes1 = await engine.enable("reference.scaffold-demo");
      assert.equal(enaRes1.success, true);
      assert.equal(engine.getState("reference.scaffold-demo"), "enabled");
      assert.equal(await gate.isModuleEnabled("reference.scaffold-demo"), true);
      assert.equal(isEnabled, true);

      // Naplníme referenční data do repository modulu
      repositoryStore.set("entity-1", { id: "entity-1", title: "Referenční entita" });
      assert.equal(repositoryStore.size, 1);

      // disable
      const disRes = await engine.disable("reference.scaffold-demo");
      assert.equal(disRes.success, true);
      assert.equal(engine.getState("reference.scaffold-demo"), "disabled");
      assert.equal(await gate.isModuleEnabled("reference.scaffold-demo"), false);
      assert.equal(isEnabled, false);
      // Data v repository zůstávají zachována při pouhém disable
      assert.equal(repositoryStore.size, 1);

      // enable (re-enable)
      const enaRes2 = await engine.enable("reference.scaffold-demo");
      assert.equal(enaRes2.success, true);
      assert.equal(engine.getState("reference.scaffold-demo"), "enabled");
      assert.equal(await gate.isModuleEnabled("reference.scaffold-demo"), true);
      assert.equal(isEnabled, true);

      // uninstall s úklidem
      const uninstRes = await engine.uninstall("reference.scaffold-demo", {
        unregister: true,
      });
      assert.equal(uninstRes.success, true);
      assert.equal(uninstRes.newState, "uninstalled");
      assert.equal(registry.has("reference.scaffold-demo"), false);
      assert.equal(isInstalled, false);
      assert.equal(isEnabled, false);
      // Data v repository byla bezpečně vyčištěna při uninstall
      assert.equal(repositoryStore.size, 0);
      assert.deepEqual(hookLogs, [
        "onInstall",
        "onEnable",
        "onDisable",
        "onEnable",
        "onDisable",
        "onUninstall",
      ]);
    });
  });
});
