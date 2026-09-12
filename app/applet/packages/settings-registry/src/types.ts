export type SettingKey = string;
export type SettingValue = unknown;
export type SettingVersion = string;

export interface SettingScope {
  projectId?: string;
  appIdentity?: string;
  moduleKey?: string;
  locale?: string;
  environment?: string;
  version?: string;
}

export interface SettingScopePolicy {
  allowProjectOverride: boolean;
  allowAppOverride: boolean;
  allowModuleOverride: boolean;
  allowLocaleOverride: boolean;
  allowEnvironmentOverride: boolean;
}

export interface SettingDefinition<T = SettingValue> {
  key: SettingKey;
  type: "string" | "number" | "boolean" | "object" | "array";
  defaultValue: T;
  scopePolicy: SettingScopePolicy;
  description: string;
  version: SettingVersion;
  isMutable: boolean;
  isSensitive: boolean;
  retention?: {
    cleanupOnUninstall?: boolean;
    orphanCleanupPolicy?: "immediate" | "retain";
  };
}

export interface SettingResolution<T = SettingValue> {
  key: SettingKey;
  value: T;
  resolvedScope: SettingScope;
  isDefault: boolean;
}

export interface SettingValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface ISettingsStore {
  getDefinition(key: SettingKey): Promise<SettingDefinition | null>;
  registerDefinition(definition: SettingDefinition): Promise<void>;
  
  getValue(key: SettingKey, scope: SettingScope): Promise<SettingValue | null>;
  setValue(key: SettingKey, scope: SettingScope, value: SettingValue): Promise<void>;
  
  deleteValue(key: SettingKey, scope: SettingScope): Promise<void>;
  cleanupOrphans(moduleKey?: string): Promise<void>;
}
