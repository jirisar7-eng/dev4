/**
 * @tmpr/module-engine - Module Registry Typed Errors
 * Deterministické typované chyby registru modulů.
 */

export type ModuleRegistryErrorCode =
  | "INVALID_MANIFEST"
  | "DUPLICATE_MODULE_KEY"
  | "CORE_VERSION_INCOMPATIBLE"
  | "CMS_VERSION_REQUIRED"
  | "CMS_VERSION_INCOMPATIBLE"
  | "MODULE_NOT_REGISTERED"
  | "ROUTE_CONFLICT";

export interface ModuleRegistryErrorOptions {
  readonly moduleKey?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

/**
 * Autoritativní výjimka vyhazovaná registrem modulů při selhání validace či registrace.
 */
export class ModuleRegistryError extends Error {
  readonly code: ModuleRegistryErrorCode;
  readonly moduleKey?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ModuleRegistryErrorCode,
    message: string,
    options?: ModuleRegistryErrorOptions
  ) {
    super(message, { cause: options?.cause });
    this.name = "ModuleRegistryError";
    this.code = code;
    this.moduleKey = options?.moduleKey;
    this.details = options?.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
