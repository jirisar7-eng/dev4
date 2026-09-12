import { InMemorySettingsStore } from "../src/store";
import { SettingsRegistry } from "../src/registry";
import { SettingDefinition } from "../src/types";

describe("SettingsRegistry", () => {
  let store: InMemorySettingsStore;
  let registry: SettingsRegistry;

  beforeEach(() => {
    store = new InMemorySettingsStore();
    registry = new SettingsRegistry(store);
  });

  it("should resolve to default if no override exists", async () => {
    const def: SettingDefinition<string> = {
      key: "theme.color",
      type: "string",
      defaultValue: "blue",
      scopePolicy: {
        allowProjectOverride: true,
        allowAppOverride: true,
        allowModuleOverride: false,
        allowLocaleOverride: false,
        allowEnvironmentOverride: false,
      },
      description: "Theme color",
      version: "1.0",
      isMutable: true,
      isSensitive: false,
    };
    await store.registerDefinition(def);

    const res = await registry.resolve("theme.color", { projectId: "p1" });
    expect(res.value).toBe("blue");
    expect(res.isDefault).toBe(true);
  });

  it("should resolve project override deterministically", async () => {
    const def: SettingDefinition<string> = {
      key: "theme.color",
      type: "string",
      defaultValue: "blue",
      scopePolicy: {
        allowProjectOverride: true,
        allowAppOverride: true,
        allowModuleOverride: false,
        allowLocaleOverride: false,
        allowEnvironmentOverride: false,
      },
      description: "Theme color",
      version: "1.0",
      isMutable: true,
      isSensitive: false,
    };
    await store.registerDefinition(def);
    
    // Set project override
    await store.setValue("theme.color", { projectId: "p1" }, "red");
    // Set global override
    await store.setValue("theme.color", {}, "green");

    const res = await registry.resolve("theme.color", { projectId: "p1" });
    expect(res.value).toBe("red");
    expect(res.isDefault).toBe(false);
    expect(res.resolvedScope.projectId).toBe("p1");
    
    // Different project should get global override
    const res2 = await registry.resolve("theme.color", { projectId: "p2" });
    expect(res2.value).toBe("green");
  });
});
