import { InMemorySettingsStore } from "../src/store";
import { SettingDefinition, SettingScope } from "../src/types";

describe("InMemorySettingsStore", () => {
  let store: InMemorySettingsStore;

  beforeEach(() => {
    store = new InMemorySettingsStore();
  });

  it("should securely store and return definitions without mutation leak", async () => {
    const def: SettingDefinition<number> = {
      key: "test.key",
      type: "number",
      defaultValue: 42,
      scopePolicy: {
        allowProjectOverride: true,
        allowAppOverride: false,
        allowModuleOverride: false,
        allowLocaleOverride: false,
        allowEnvironmentOverride: false,
      },
      description: "Test",
      version: "1.0",
      isMutable: true,
      isSensitive: false,
    };

    await store.registerDefinition(def);
    
    // Mutate original object
    def.defaultValue = 100;
    
    const retrieved = await store.getDefinition("test.key");
    expect(retrieved?.defaultValue).toBe(42); // Should not leak mutation
    
    if (retrieved) {
      retrieved.defaultValue = 999;
    }
    
    const retrievedAgain = await store.getDefinition("test.key");
    expect(retrievedAgain?.defaultValue).toBe(42); // Defensive copies work
  });

  it("should securely store and return scoped values", async () => {
    const scope: SettingScope = { projectId: "project-1" };
    const value = { nested: "data" };
    
    await store.setValue("test.key", scope, value);
    
    // Mutate input
    value.nested = "hacked";
    
    const retrieved = (await store.getValue("test.key", scope)) as any;
    expect(retrieved.nested).toBe("data");
    
    // Mutate output
    retrieved.nested = "hacked-again";
    
    const retrievedAgain = (await store.getValue("test.key", scope)) as any;
    expect(retrievedAgain.nested).toBe("data");
  });
  
  it("should allow deleting a value", async () => {
    const scope: SettingScope = { projectId: "project-1" };
    await store.setValue("test.key", scope, "data");
    
    let retrieved = await store.getValue("test.key", scope);
    expect(retrieved).toBe("data");
    
    await store.deleteValue("test.key", scope);
    
    retrieved = await store.getValue("test.key", scope);
    expect(retrieved).toBeNull();
  });
});
