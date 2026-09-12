import { 
  ISettingsStore, 
  SettingDefinition, 
  SettingKey, 
  SettingScope, 
  SettingValue 
} from "./types";

function deepClone<T>(obj: T): T {
  if (obj === undefined) return undefined as any;
  return JSON.parse(JSON.stringify(obj));
}

function getScopeKey(scope: SettingScope): string {
  return [
    scope.projectId || "*",
    scope.appIdentity || "*",
    scope.moduleKey || "*",
    scope.locale || "*",
    scope.environment || "*",
    scope.version || "*"
  ].join("|");
}

export class InMemorySettingsStore implements ISettingsStore {
  private definitions: Map<SettingKey, SettingDefinition> = new Map();
  // Map<SettingKey, Map<ScopeKey, SettingValue>>
  private values: Map<SettingKey, Map<string, SettingValue>> = new Map();

  async getDefinition(key: SettingKey): Promise<SettingDefinition | null> {
    const def = this.definitions.get(key);
    return def ? deepClone(def) : null;
  }

  async registerDefinition(definition: SettingDefinition): Promise<void> {
    this.definitions.set(definition.key, deepClone(definition));
  }

  async getValue(key: SettingKey, scope: SettingScope): Promise<SettingValue | null> {
    const keyValues = this.values.get(key);
    if (!keyValues) return null;
    
    const scopeKey = getScopeKey(scope);
    const val = keyValues.get(scopeKey);
    return val !== undefined ? deepClone(val) : null;
  }

  async setValue(key: SettingKey, scope: SettingScope, value: SettingValue): Promise<void> {
    let keyValues = this.values.get(key);
    if (!keyValues) {
      keyValues = new Map();
      this.values.set(key, keyValues);
    }
    
    const scopeKey = getScopeKey(scope);
    keyValues.set(scopeKey, deepClone(value));
  }

  async deleteValue(key: SettingKey, scope: SettingScope): Promise<void> {
    const keyValues = this.values.get(key);
    if (!keyValues) return;
    
    const scopeKey = getScopeKey(scope);
    keyValues.delete(scopeKey);
  }

  async cleanupOrphans(moduleKey?: string): Promise<void> {
    // In memory implementation for orphans.
    // E.g. find values that lack a matching definition.
    for (const [key, scopeMap] of this.values.entries()) {
      const def = this.definitions.get(key);
      if (!def) {
        // Orphaned values because definition is gone
        this.values.delete(key);
        continue;
      }
      
      // If moduleKey is provided, maybe we delete scopes associated with it if allowed
      if (moduleKey && def.retention?.cleanupOnUninstall) {
        for (const scopeKey of scopeMap.keys()) {
          // crude check for moduleKey inside scope string
          if (scopeKey.includes(`|${moduleKey}|`)) {
            scopeMap.delete(scopeKey);
          }
        }
      }
    }
  }
}
