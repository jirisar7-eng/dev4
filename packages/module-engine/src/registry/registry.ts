/**
 * @tmpr/module-engine - Module Registry Implementation
 * Autoritativní běhový registr modulů platformy Synthesis OS.
 *
 * VLASTNOSTI:
 * - projektově neutrální (žádná aplikační či CMS business logika)
 * - fail-closed chování
 * - deterministický
 * - in-memory stav (žádný přímý zápis do DB v této fázi)
 * - nezávislý na Dependency Resolveru (moduly se mohou registrovat i bez přítomnosti závislostí)
 * - striktní zapouzdření stavu (veřejné API vrací neměnné snapshoty, interní mutable record je izolován)
 * - hluboké zmrazení manifestu (deep freeze a oddělená manifest reprezentace přes structuredClone)
 */

import semver from "semver";
import { safeValidateModuleManifest } from "../contract/validator.js";
import { isValidSemver } from "../contract/manifest.schema.js";
import type { IModule, IModuleManifest, ModuleLifecycleState } from "../contract/types.js";
import type {
  DeepReadonly,
  IModuleRegistry,
  IModuleRegistryRecord,
  ModuleRegistryOptions
} from "./registry.types.js";
import { ModuleRegistryError } from "./registry.errors.js";
import { deepFreeze } from "./registry.utils.js";
import { registryMutators, type IMutableModuleRegistry } from "./registry.internal.js";

/**
 * Interní mutable záznam držený ModuleRegistry.
 * Není exportován do veřejného API balíčku a externí kód k němu nemá přístup.
 */
interface InternalModuleRegistryRecord {
  readonly moduleKey: string;
  readonly version: string;
  state: ModuleLifecycleState;
  readonly manifest: DeepReadonly<IModuleManifest>;
  readonly module: IModule;
  readonly registeredAt: string;
}

/**
 * Interní implementace registru, která obsahuje všechny metody včetně mutačních.
 */
class InternalModuleRegistry implements IMutableModuleRegistry {
  private readonly options: ModuleRegistryOptions;
  private readonly records = new Map<string, InternalModuleRegistryRecord>();
  private readonly routeIndex = new Map<string, string>();

  constructor(options?: ModuleRegistryOptions) {
    this.options = {
      synthesisCoreVersion: options?.synthesisCoreVersion ?? "0.1.0",
      synthesisCmsVersion: options?.synthesisCmsVersion,
    };
  }

  public register(module: IModule): void {
    if (!module || typeof module !== "object") {
      throw new ModuleRegistryError("INVALID_MANIFEST", "Cannot register module: Invalid instance", { moduleKey: "unknown" });
    }
    const manifestResult = safeValidateModuleManifest(module.manifest);
    if (!manifestResult.success) {
      throw new ModuleRegistryError(
        "INVALID_MANIFEST",
        `Cannot register module: Manifest validation failed - ${String(manifestResult.errors)}`,
        { moduleKey: "unknown", details: { errors: manifestResult.errors } }
      );
    }
    const rawManifest = manifestResult.data;
    const manifest = deepFreeze(structuredClone(rawManifest)) as DeepReadonly<IModuleManifest>;
    const moduleKey = manifest.moduleKey;
    if (!isValidSemver(manifest.version)) {
      throw new ModuleRegistryError("INVALID_MANIFEST", `Module '${moduleKey}' has invalid semver version '${manifest.version}'`, { moduleKey });
    }
    if (this.records.has(moduleKey)) {
      throw new ModuleRegistryError("DUPLICATE_MODULE_KEY", `Module '${moduleKey}' is already registered in registry`, { moduleKey });
    }
    const coreRange = manifest.compatibility.synthesisCore;
    if (!semver.satisfies(this.options.synthesisCoreVersion, coreRange)) {
      throw new ModuleRegistryError("CORE_VERSION_INCOMPATIBLE", `Module '${moduleKey}' requires synthesisCore '${coreRange}', but registry runtime provides '${this.options.synthesisCoreVersion}'`, { moduleKey, details: { requiredRange: coreRange, runtimeVersion: this.options.synthesisCoreVersion } });
    }
    const cmsRange = manifest.compatibility.synthesisCms;
    if (cmsRange !== undefined) {
      if (!this.options.synthesisCmsVersion) {
        throw new ModuleRegistryError("CMS_VERSION_REQUIRED", `Module '${moduleKey}' requires synthesisCms '${cmsRange}', but registry runtime has no CMS version configured`, { moduleKey, details: { requiredRange: cmsRange } });
      }
      if (!semver.satisfies(this.options.synthesisCmsVersion, cmsRange)) {
        throw new ModuleRegistryError("CMS_VERSION_INCOMPATIBLE", `Module '${moduleKey}' requires synthesisCms '${cmsRange}', but registry runtime provides '${this.options.synthesisCmsVersion}'`, { moduleKey, details: { requiredRange: cmsRange, runtimeVersion: this.options.synthesisCmsVersion } });
      }
    }
    const routesToRegister: { surface: string; path: string; key: string }[] = [];
    const seenInModule = new Set<string>();
    for (const route of manifest.routes) {
      const routeKey = `${route.surface}:${route.path}`;
      if (this.routeIndex.has(routeKey)) {
        const existingOwner = this.routeIndex.get(routeKey);
        throw new ModuleRegistryError("ROUTE_CONFLICT", `Route '${route.path}' on surface '${route.surface}' declared by module '${moduleKey}' is already owned by module '${existingOwner}'`, { moduleKey, details: { surface: route.surface, path: route.path, existingOwner } });
      }
      if (seenInModule.has(routeKey)) {
        throw new ModuleRegistryError("ROUTE_CONFLICT", `Module '${moduleKey}' declares duplicate route '${route.path}' on surface '${route.surface}' within its own manifest`, { moduleKey, details: { surface: route.surface, path: route.path } });
      }
      seenInModule.add(routeKey);
      routesToRegister.push({ surface: route.surface, path: route.path, key: routeKey });
    }
    for (const r of routesToRegister) {
      this.routeIndex.set(r.key, moduleKey);
    }
    const record: InternalModuleRegistryRecord = { moduleKey, version: manifest.version, state: "uninstalled", manifest, module, registeredAt: new Date().toISOString() };
    this.records.set(moduleKey, record);
  }

  private toPublicRecord(internal: InternalModuleRegistryRecord): IModuleRegistryRecord {
    return Object.freeze({ moduleKey: internal.moduleKey, version: internal.version, state: internal.state, manifest: internal.manifest, module: internal.module, registeredAt: internal.registeredAt });
  }

  public get(moduleKey: string): IModule | undefined {
    return this.records.get(moduleKey)?.module;
  }

  public list(): readonly IModule[] {
    return Object.freeze(Array.from(this.records.values()).map((r) => r.module));
  }

  public has(moduleKey: string): boolean {
    return this.records.has(moduleKey);
  }

  public getRecord(moduleKey: string): IModuleRegistryRecord | undefined {
    const internal = this.records.get(moduleKey);
    if (!internal) return undefined;
    return this.toPublicRecord(internal);
  }

  public listRecords(): readonly IModuleRegistryRecord[] {
    return Object.freeze(Array.from(this.records.values()).map((r) => this.toPublicRecord(r)));
  }

  public getRouteOwner(surface: string, path: string): string | undefined {
    const routeKey = `${surface}:${path}`;
    return this.routeIndex.get(routeKey);
  }

  public recordState(moduleKey: string, state: ModuleLifecycleState): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError("MODULE_NOT_REGISTERED", `Cannot update state for module '${moduleKey}': module is not registered in registry`, { moduleKey });
    }
    record.state = state;
  }

  public unregister(moduleKey: string): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError("MODULE_NOT_REGISTERED", "Cannot unregister module '" + moduleKey + "': module is not registered in registry", { moduleKey });
    }
    this.unregisterRoutes(moduleKey);
    this.records.delete(moduleKey);
  }

  public unregisterRoutes(moduleKey: string): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError("MODULE_NOT_REGISTERED", "Cannot unregister routes for module '" + moduleKey + "': module is not registered in registry", { moduleKey });
    }
    for (const route of record.manifest.routes) {
      const routeKey = `${route.surface}:${route.path}`;
      if (this.routeIndex.get(routeKey) === moduleKey) {
        this.routeIndex.delete(routeKey);
      }
    }
  }

  public registerRoutes(moduleKey: string): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError("MODULE_NOT_REGISTERED", "Cannot register routes for module '" + moduleKey + "': module is not registered in registry", { moduleKey });
    }
    for (const route of record.manifest.routes) {
      const routeKey = `${route.surface}:${route.path}`;
      const existingOwner = this.routeIndex.get(routeKey);
      if (existingOwner && existingOwner !== moduleKey) {
        throw new ModuleRegistryError("ROUTE_CONFLICT", "Route '" + route.path + "' on surface '" + route.surface + "' declared by module '" + moduleKey + "' is already owned by module '" + existingOwner + "'", { moduleKey, details: { surface: route.surface, path: route.path, existingOwner } });
      }
      this.routeIndex.set(routeKey, moduleKey);
    }
  }
}

/**
 * Veřejná fasáda pro ModuleRegistry.
 * Sama o sobě fyzicky neobsahuje mutační metody.
 */
export class ModuleRegistry implements IModuleRegistry {
  readonly #internal: InternalModuleRegistry;

  constructor(options?: ModuleRegistryOptions) {
    this.#internal = new InternalModuleRegistry(options);
    registryMutators.set(this, this.#internal);
  }

  public register(module: IModule): void { this.#internal.register(module); }
  public get(moduleKey: string): IModule | undefined { return this.#internal.get(moduleKey); }
  public list(): readonly IModule[] { return this.#internal.list(); }
  public has(moduleKey: string): boolean { return this.#internal.has(moduleKey); }
  public getRecord(moduleKey: string): IModuleRegistryRecord | undefined { return this.#internal.getRecord(moduleKey); }
  public listRecords(): readonly IModuleRegistryRecord[] { return this.#internal.listRecords(); }
  public getRouteOwner(surface: string, path: string): string | undefined { return this.#internal.getRouteOwner(surface, path); }
}
