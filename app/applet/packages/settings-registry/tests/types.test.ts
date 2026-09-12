import { SettingScope, SettingDefinition } from "../src/types";

describe("Settings Registry Contracts", () => {
  it("should define a valid setting scope", () => {
    const scope: SettingScope = {
      projectId: "proj-123",
      environment: "production",
      locale: "cs-CZ",
    };
    
    expect(scope.projectId).toBe("proj-123");
    expect(scope.environment).toBe("production");
    expect(scope.locale).toBe("cs-CZ");
  });

  it("should define a valid setting definition", () => {
    const def: SettingDefinition<number> = {
      key: "core.pagination.limit",
      type: "number",
      defaultValue: 20,
      scopePolicy: {
        allowProjectOverride: true,
        allowAppOverride: false,
        allowModuleOverride: false,
        allowLocaleOverride: false,
        allowEnvironmentOverride: true,
      },
      description: "Default pagination limit",
      version: "1.0.0",
      isMutable: true,
      isSensitive: false,
    };
    
    expect(def.key).toBe("core.pagination.limit");
    expect(def.defaultValue).toBe(20);
    expect(def.scopePolicy.allowProjectOverride).toBe(true);
  });
});
