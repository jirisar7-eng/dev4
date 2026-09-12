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

  /**
   * Generates a deterministic array of fallback scopes to check, 
   * from most specific to least specific.
   * 
   * Precedence order (highest to lowest):
   * 1. Full match (all provided scopes)
   * 2. Project
   * 3. App Identity
   * 4. Module
   * 5. Locale
   * 6. Environment
   * 7. Version
   * 8. Global (empty scope)
   * 
   * A true Cartesian fallback is complex, but typically we want:
   * exact match > project level > app level > module level > environment > global.
   */
  private generateFallbackScopes(scope: SettingScope): SettingScope[] {
    const scopes: SettingScope[] = [];

    // Utility to add if not already in list
    const addScope = (s: SettingScope) => {
      // In a real implementation we might serialize to check uniqueness
      scopes.push(s);
    };

    // Very explicit fallback chain:
    // 1. Exact scope
    addScope({ ...scope });
    
    // 2. Project overrides (ignoring locale/env/module if they fall back)
    if (scope.projectId) {
      if (scope.appIdentity) addScope({ projectId: scope.projectId, appIdentity: scope.appIdentity });
      addScope({ projectId: scope.projectId });
    }

    // 3. App Identity overrides
    if (scope.appIdentity) {
      if (scope.environment) addScope({ appIdentity: scope.appIdentity, environment: scope.environment });
      addScope({ appIdentity: scope.appIdentity });
    }

    // 4. Module overrides
    if (scope.moduleKey) {
      addScope({ moduleKey: scope.moduleKey });
    }

    // 5. Locale overrides
    if (scope.locale) {
      addScope({ locale: scope.locale });
    }

    // 6. Environment overrides
    if (scope.environment) {
      addScope({ environment: scope.environment });
    }
    
    // 7. Version overrides
    if (scope.version) {
      addScope({ version: scope.version });
    }

    // 8. Global (empty)
    addScope({});

    return scopes;
  }

  async resolve<T = SettingValue>(key: SettingKey, scope: SettingScope): Promise<SettingResolution<T>> {
    const def = await this.store.getDefinition(key);
    if (!def) {
      throw new Error(`Setting definition not found for key: ${key}`);
    }

    const fallbackScopes = this.generateFallbackScopes(scope);

    for (const fallbackScope of fallbackScopes) {
      // We should technically check if the definition's scopePolicy allows this fallback type,
      // but for resolution precedence, we can check if it exists in store.
      // If the store rejects invalid sets, it won't exist anyway.
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

    // Fallback to default
    return {
      key,
      value: def.defaultValue as T,
      resolvedScope: {}, // Indicates global default
      isDefault: true
    };
  }
}
