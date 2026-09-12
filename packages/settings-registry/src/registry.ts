import { 
  ISettingsStore, 
  SettingDefinition, 
  SettingKey, 
  SettingResolution, 
  SettingScope, 
  SettingValue 
} from "./types";

export class SettingsRegistry {
  constructor(private store: ISettingsStore) {}

  // ... [keep generateFallbackScopes] ...
  private generateFallbackScopes(scope: SettingScope): SettingScope[] {
    const scopes: SettingScope[] = [];
    const addScope = (s: SettingScope) => scopes.push(s);

    addScope({ ...scope });
    
    if (scope.projectId) {
      if (scope.appIdentity) addScope({ projectId: scope.projectId, appIdentity: scope.appIdentity });
      addScope({ projectId: scope.projectId });
    }
    if (scope.appIdentity) {
      if (scope.environment) addScope({ appIdentity: scope.appIdentity, environment: scope.environment });
      addScope({ appIdentity: scope.appIdentity });
    }
    if (scope.moduleKey) addScope({ moduleKey: scope.moduleKey });
    if (scope.locale) addScope({ locale: scope.locale });
    if (scope.environment) addScope({ environment: scope.environment });
    if (scope.version) addScope({ version: scope.version });
    
    addScope({});
    return scopes;
  }

  async registerDefinition(definition: SettingDefinition): Promise<void> {
    if (definition.isSensitive) {
      throw new Error(`Cannot register sensitive setting ${definition.key}. Secrets belong in a SecretStore.`);
    }
    await this.store.registerDefinition(definition);
  }

  async resolve<T = SettingValue>(key: SettingKey, scope: SettingScope): Promise<SettingResolution<T>> {
    const def = await this.store.getDefinition(key);
    if (!def) {
      throw new Error(`Setting definition not found for key: ${key}`);
    }

    const fallbackScopes = this.generateFallbackScopes(scope);

    for (const fallbackScope of fallbackScopes) {
      const val = await this.store.getValue(key, fallbackScope);
      if (val !== null) {
        return {
          key,
          value: val as T,
          resolvedScope: fallbackScope,
          isDefault: false
        };
      }
    }

    return {
      key,
      value: def.defaultValue as T,
      resolvedScope: {},
      isDefault: true
    };
  }

  private validateScopePolicy(def: SettingDefinition, scope: SettingScope): void {
    if (scope.projectId && !def.scopePolicy.allowProjectOverride) {
      throw new Error(`Setting ${def.key} does not allow project overrides.`);
    }
    if (scope.appIdentity && !def.scopePolicy.allowAppOverride) {
      throw new Error(`Setting ${def.key} does not allow app overrides.`);
    }
    if (scope.moduleKey && !def.scopePolicy.allowModuleOverride) {
      throw new Error(`Setting ${def.key} does not allow module overrides.`);
    }
    if (scope.locale && !def.scopePolicy.allowLocaleOverride) {
      throw new Error(`Setting ${def.key} does not allow locale overrides.`);
    }
    if (scope.environment && !def.scopePolicy.allowEnvironmentOverride) {
      throw new Error(`Setting ${def.key} does not allow environment overrides.`);
    }
  }

  private validateValueType(def: SettingDefinition, value: SettingValue): void {
    if (value === null || value === undefined) return;
    
    let isValid = false;
    switch (def.type) {
      case "string": isValid = typeof value === "string"; break;
      case "number": isValid = typeof value === "number"; break;
      case "boolean": isValid = typeof value === "boolean"; break;
      case "object": isValid = typeof value === "object" && !Array.isArray(value); break;
      case "array": isValid = Array.isArray(value); break;
    }
    
    if (!isValid) {
      throw new Error(`Value for setting ${def.key} does not match expected type ${def.type}.`);
    }
  }

  async setValue(key: SettingKey, scope: SettingScope, value: SettingValue): Promise<void> {
    const def = await this.store.getDefinition(key);
    if (!def) {
      throw new Error(`Setting definition not found for key: ${key}`);
    }

    if (!def.isMutable) {
      throw new Error(`Setting ${key} is immutable and cannot be updated.`);
    }
    
    // Cross-project / cross-app leaks are inherently prevented by passing explicitly scoped identifiers to the store.
    // Ensure the policy permits setting this scope
    this.validateScopePolicy(def, scope);
    
    // Type checking
    this.validateValueType(def, value);

    await this.store.setValue(key, scope, value);
    // Future cache invalidation / audit hook would go here
  }

  async deleteValue(key: SettingKey, scope: SettingScope): Promise<void> {
    const def = await this.store.getDefinition(key);
    if (!def) {
      throw new Error(`Setting definition not found for key: ${key}`);
    }
    if (!def.isMutable) {
      throw new Error(`Setting ${key} is immutable and cannot be deleted.`);
    }
    await this.store.deleteValue(key, scope);
  }

  async cleanupModuleOrphans(moduleKey: string): Promise<void> {
    await this.store.cleanupOrphans(moduleKey);
  }
}
