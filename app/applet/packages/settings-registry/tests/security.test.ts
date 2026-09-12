import { InMemorySettingsStore } from "../src/store";
import { SettingsRegistry } from "../src/registry";
import { SettingDefinition } from "../src/types";

describe("SettingsRegistry Security & Lifecycle", () => {
  let store: InMemorySettingsStore;
  let registry: SettingsRegistry;

  beforeEach(() => {
    store = new InMemorySettingsStore();
    registry = new SettingsRegistry(store);
  });

  const baseDef: SettingDefinition<string> = {
    key: "app.theme",
    type: "string",
    defaultValue: "light",
    scopePolicy: {
      allowProjectOverride: true,
      allowAppOverride: true,
      allowModuleOverride: true,
      allowLocaleOverride: true,
      allowEnvironmentOverride: true,
    },
    description: "App Theme",
    version: "1.0",
    isMutable: true,
    isSensitive: false,
    retention: {
      cleanupOnUninstall: true,
    }
  };

  it("should fail when registering sensitive setting", async () => {
    const sensitiveDef = { ...baseDef, key: "app.secret", isSensitive: true };
    await expect(registry.registerDefinition(sensitiveDef)).rejects.toThrow(/sensitive setting/);
  });

  it("should fail on invalid value type", async () => {
    await registry.registerDefinition(baseDef);
    await expect(registry.setValue("app.theme", {}, 123)).rejects.toThrow(/does not match expected type/);
  });

  it("should fail on immutable update", async () => {
    const immutableDef = { ...baseDef, key: "app.immutable", isMutable: false };
    await registry.registerDefinition(immutableDef);
    await expect(registry.setValue("app.immutable", {}, "dark")).rejects.toThrow(/immutable/);
  });

  it("should fail when overriding disallowed scope", async () => {
    const noProjDef = { ...baseDef, key: "app.noproject", scopePolicy: { ...baseDef.scopePolicy, allowProjectOverride: false } };
    await registry.registerDefinition(noProjDef);
    await expect(registry.setValue("app.noproject", { projectId: "p1" }, "dark")).rejects.toThrow(/does not allow project overrides/);
  });

  it("should prevent cross-project leak", async () => {
    await registry.registerDefinition(baseDef);
    await registry.setValue("app.theme", { projectId: "p1" }, "dark");
    
    const p1 = await registry.resolve("app.theme", { projectId: "p1" });
    const p2 = await registry.resolve("app.theme", { projectId: "p2" });
    
    expect(p1.value).toBe("dark");
    expect(p2.value).toBe("light");
    expect(p2.isDefault).toBe(true);
  });

  it("should prevent cross-app leak", async () => {
    await registry.registerDefinition(baseDef);
    await registry.setValue("app.theme", { appIdentity: "app1" }, "dark");
    
    const a1 = await registry.resolve("app.theme", { appIdentity: "app1" });
    const a2 = await registry.resolve("app.theme", { appIdentity: "app2" });
    
    expect(a1.value).toBe("dark");
    expect(a2.value).toBe("light");
  });

  it("should cleanup orphans on uninstall", async () => {
    await registry.registerDefinition(baseDef);
    await registry.setValue("app.theme", { moduleKey: "moduleA" }, "dark");
    
    expect((await registry.resolve("app.theme", { moduleKey: "moduleA" })).value).toBe("dark");
    
    await registry.cleanupModuleOrphans("moduleA");
    
    expect((await registry.resolve("app.theme", { moduleKey: "moduleA" })).value).toBe("light");
  });

  it("should resolve missing setting deterministically", async () => {
    await expect(registry.resolve("non.existent", {})).rejects.toThrow(/not found/);
  });

  it("should maintain deterministic precedence", async () => {
    await registry.registerDefinition(baseDef);
    
    await registry.setValue("app.theme", { projectId: "p1", appIdentity: "app1" }, "exact-match");
    await registry.setValue("app.theme", { projectId: "p1" }, "project-match");
    await registry.setValue("app.theme", { appIdentity: "app1" }, "app-match");
    await registry.setValue("app.theme", { environment: "prod" }, "env-match");
    await registry.setValue("app.theme", {}, "global-match");

    // Exact Match
    expect((await registry.resolve("app.theme", { projectId: "p1", appIdentity: "app1", environment: "prod" })).value).toBe("exact-match");
    // Project Match
    expect((await registry.resolve("app.theme", { projectId: "p1", environment: "prod" })).value).toBe("project-match");
    // App Match
    expect((await registry.resolve("app.theme", { appIdentity: "app1", environment: "prod" })).value).toBe("app-match");
    // Env Match
    expect((await registry.resolve("app.theme", { environment: "prod" })).value).toBe("env-match");
    // Global Match
    expect((await registry.resolve("app.theme", {})).value).toBe("global-match");
  });
});
