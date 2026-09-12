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
  IMutableModuleRegistry,
  IModuleRegistryRecord,
  ModuleRegistryOptions
} from "./registry.types.js";
import { ModuleRegistryError } from "./registry.errors.js";
import { deepFreeze } from "./registry.utils.js";

/**
 * Interní mutable záznam držený ModuleRegistry.
 * Není exportován do veřejného API balíčku a externí kód k němu nemá přístup.
 * Manifest je autoritativní, oddělený a hluboce neměnný.
 */
interface InternalModuleRegistryRecord {
  readonly moduleKey: string;
  readonly version: string;
  state: ModuleLifecycleState;
  readonly manifest: DeepReadonly<IModuleManifest>;
  readonly module: IModule;
  readonly registeredAt: string;
}

export class ModuleRegistry implements IMutableModuleRegistry {
  private readonly options: ModuleRegistryOptions;
  private readonly records = new Map<string, InternalModuleRegistryRecord>();
  private readonly routeIndex = new Map<string, string>(); // `${surface}:${path}` -> moduleKey

  constructor(options: ModuleRegistryOptions) {
    if (
      !options ||
      typeof options.synthesisCoreVersion !== "string" ||
      !isValidSemver(options.synthesisCoreVersion)
    ) {
      throw new ModuleRegistryError(
        "CORE_VERSION_INCOMPATIBLE",
        `Invalid or missing synthesisCoreVersion in ModuleRegistry options: '${options?.synthesisCoreVersion}'`
      );
    }

    if (
      options.synthesisCmsVersion !== undefined &&
      (typeof options.synthesisCmsVersion !== "string" ||
        !isValidSemver(options.synthesisCmsVersion))
    ) {
      throw new ModuleRegistryError(
        "CMS_VERSION_INCOMPATIBLE",
        `Invalid synthesisCmsVersion in ModuleRegistry options: '${options.synthesisCmsVersion}'`
      );
    }

    this.options = { ...options };
  }

  /**
   * Zaregistruje modul do registru po striktních bezpečnostních kontrolách:
   * 1. Validace manifestu přes autoritativní Zod schéma
   * 2. Kontrola duplicity moduleKey (jeden moduleKey právě jednou)
   * 3. Ověření kompatibility synthesisCore
   * 4. Ověření kompatibility synthesisCms (pokud je modulem deklarována)
   * 5. Kontrola konfliktů deklarovaných rout (surface + path)
   *
   * Po registraci je stav životního cyklu nastaven na 'uninstalled'.
   * Registrace nespouští žádné lifecycle hooky.
   * Manifest je uložen jako samostatný, hluboce zmrazený klon (deeply immutable).
   */
  public register(module: IModule): void {
    if (!module || typeof module !== "object" || !module.manifest) {
      throw new ModuleRegistryError(
        "INVALID_MANIFEST",
        "Module must be an object with a valid manifest property"
      );
    }

    // 1. Validace manifestu přes autoritativní validátor
    const validation = safeValidateModuleManifest(module.manifest);
    if (!validation.success) {
      throw new ModuleRegistryError(
        "INVALID_MANIFEST",
        `Module manifest validation failed: ${validation.errors.join("; ")}`,
        { details: { errors: validation.errors } }
      );
    }

    // Vytvoření samostatného klonu a jeho hluboké zmrazení pro garanci
    // úplného oddělení od původního objektu module.manifest a runtime immutability
    const manifestClone = structuredClone(validation.data);
    const manifest = deepFreeze(manifestClone);
    const { moduleKey } = manifest;

    // 2. Kontrola duplicity moduleKey
    if (this.records.has(moduleKey)) {
      throw new ModuleRegistryError(
        "DUPLICATE_MODULE_KEY",
        `Module '${moduleKey}' is already registered in registry`,
        { moduleKey }
      );
    }

    // 3. Ověření kompatibility synthesisCore
    const coreRange = manifest.compatibility.synthesisCore;
    if (!semver.satisfies(this.options.synthesisCoreVersion, coreRange)) {
      throw new ModuleRegistryError(
        "CORE_VERSION_INCOMPATIBLE",
        `Module '${moduleKey}' requires synthesisCore '${coreRange}', but registry runtime provides '${this.options.synthesisCoreVersion}'`,
        {
          moduleKey,
          details: {
            requiredRange: coreRange,
            runtimeVersion: this.options.synthesisCoreVersion
          }
        }
      );
    }

    // 4. Ověření kompatibility synthesisCms
    const cmsRange = manifest.compatibility.synthesisCms;
    if (cmsRange !== undefined) {
      if (!this.options.synthesisCmsVersion) {
        throw new ModuleRegistryError(
          "CMS_VERSION_REQUIRED",
          `Module '${moduleKey}' requires synthesisCms '${cmsRange}', but registry runtime has no CMS version configured`,
          { moduleKey, details: { requiredRange: cmsRange } }
        );
      }

      if (!semver.satisfies(this.options.synthesisCmsVersion, cmsRange)) {
        throw new ModuleRegistryError(
          "CMS_VERSION_INCOMPATIBLE",
          `Module '${moduleKey}' requires synthesisCms '${cmsRange}', but registry runtime provides '${this.options.synthesisCmsVersion}'`,
          {
            moduleKey,
            details: {
              requiredRange: cmsRange,
              runtimeVersion: this.options.synthesisCmsVersion
            }
          }
        );
      }
    }

    // 5. Kontrola konfliktů deklarovaných rout (surface + path)
    const routesToRegister: { surface: string; path: string; key: string }[] = [];
    const seenInModule = new Set<string>();

    for (const route of manifest.routes) {
      const routeKey = `${route.surface}:${route.path}`;
      if (this.routeIndex.has(routeKey)) {
        const existingOwner = this.routeIndex.get(routeKey);
        throw new ModuleRegistryError(
          "ROUTE_CONFLICT",
          `Route '${route.path}' on surface '${route.surface}' declared by module '${moduleKey}' is already owned by module '${existingOwner}'`,
          {
            moduleKey,
            details: {
              surface: route.surface,
              path: route.path,
              existingOwner
            }
          }
        );
      }

      if (seenInModule.has(routeKey)) {
        throw new ModuleRegistryError(
          "ROUTE_CONFLICT",
          `Module '${moduleKey}' declares duplicate route '${route.path}' on surface '${route.surface}' within its own manifest`,
          {
            moduleKey,
            details: { surface: route.surface, path: route.path }
          }
        );
      }

      seenInModule.add(routeKey);
      routesToRegister.push({
        surface: route.surface,
        path: route.path,
        key: routeKey
      });
    }

    // Všechny validace prošly: zápis do registru
    for (const r of routesToRegister) {
      this.routeIndex.set(r.key, moduleKey);
    }

    const record: InternalModuleRegistryRecord = {
      moduleKey,
      version: manifest.version,
      state: "uninstalled",
      manifest,
      module,
      registeredAt: new Date().toISOString()
    };

    this.records.set(moduleKey, record);
  }

  /**
   * Převede interní mutable záznam na bezpečný, zmrazený read-only snapshot.
   * Manifest je již hluboce zmrazen v záznamu.
   */
  private toPublicRecord(internal: InternalModuleRegistryRecord): IModuleRegistryRecord {
    return Object.freeze({
      moduleKey: internal.moduleKey,
      version: internal.version,
      state: internal.state,
      manifest: internal.manifest,
      module: internal.module,
      registeredAt: internal.registeredAt
    });
  }

  /**
   * Vrátí modul dle jeho moduleKey nebo undefined.
   */
  public get(moduleKey: string): IModule | undefined {
    return this.records.get(moduleKey)?.module;
  }

  /**
   * Vrátí seznam všech registrovaných modulů jako neměnnou kolekci.
   */
  public list(): readonly IModule[] {
    return Object.freeze(Array.from(this.records.values()).map((r) => r.module));
  }

  /**
   * Zjistí přítomnost modulu v registru.
   */
  public has(moduleKey: string): boolean {
    return this.records.has(moduleKey);
  }

  /**
   * Vrátí bezpečný read-only snapshot autoritativního záznamu registru pro daný modul.
   * Nevrací referenci na interní mutable záznam a manifest je hluboce neměnný.
   */
  public getRecord(moduleKey: string): IModuleRegistryRecord | undefined {
    const internal = this.records.get(moduleKey);
    if (!internal) {
      return undefined;
    }
    return this.toPublicRecord(internal);
  }

  /**
   * Vrátí seznam bezpečných read-only snapshotů všech autoritativních záznamů registru.
   * Pole je zmrazeno a položky i jejich manifesty jsou hluboce neměnné.
   */
  public listRecords(): readonly IModuleRegistryRecord[] {
    return Object.freeze(
      Array.from(this.records.values()).map((r) => this.toPublicRecord(r))
    );
  }

  /**
   * Vyhledá vlastníka dané cesty na specifikované surface.
   */
  public getRouteOwner(surface: string, path: string): string | undefined {
    const routeKey = `${surface}:${path}`;
    return this.routeIndex.get(routeKey);
  }

  /**
   * Zaznamená aktualizaci stavu životního cyklu modulu.
   * Jediná autoritativní cesta pro změnu stavu v registru.
   * NESPOUŠTÍ žádné hooky (onInstall, onEnable apod.).
   */
  public recordState(moduleKey: string, state: ModuleLifecycleState): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError(
        "MODULE_NOT_REGISTERED",
        `Cannot update state for module '${moduleKey}': module is not registered in registry`,
        { moduleKey }
      );
    }
    record.state = state;
  }

  /**
   * Zcela odregistruje modul z registru:
   * 1. Ověří existenci modulu v registru
   * 2. Odstraní všechny jeho routy z route indexu
   * 3. Smaže záznam modulu z registru
   */
  public unregister(moduleKey: string): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError(
        "MODULE_NOT_REGISTERED",
        "Cannot unregister module \x27" + moduleKey + "\x27: module is not registered in registry",
        { moduleKey }
      );
    }
    this.unregisterRoutes(moduleKey);
    this.records.delete(moduleKey);
  }

  /**
   * Odregistruje všechny deklarované routy daného modulu z route indexu.
   */
  public unregisterRoutes(moduleKey: string): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError(
        "MODULE_NOT_REGISTERED",
        "Cannot unregister routes for module \x27" + moduleKey + "\x27: module is not registered in registry",
        { moduleKey }
      );
    }
    for (const route of record.manifest.routes) {
      const routeKey = `${route.surface}:${route.path}`;
      if (this.routeIndex.get(routeKey) === moduleKey) {
        this.routeIndex.delete(routeKey);
      }
    }
  }

  /**
   * Znovu zaregistruje deklarované routy modulu do route indexu.
   * Kontroluje případné kolize s jinými moduly.
   */
  public registerRoutes(moduleKey: string): void {
    const record = this.records.get(moduleKey);
    if (!record) {
      throw new ModuleRegistryError(
        "MODULE_NOT_REGISTERED",
        "Cannot register routes for module \x27" + moduleKey + "\x27: module is not registered in registry",
        { moduleKey }
      );
    }
    for (const route of record.manifest.routes) {
      const routeKey = `${route.surface}:${route.path}`;
      const existingOwner = this.routeIndex.get(routeKey);
      if (existingOwner && existingOwner !== moduleKey) {
        throw new ModuleRegistryError(
          "ROUTE_CONFLICT",
          "Route \x27" + route.path + "\x27 on surface \x27" + route.surface + "\x27 declared by module \x27" + moduleKey + "\x27 is already owned by module \x27" + existingOwner + "\x27",
          {
            moduleKey,
            details: {
              surface: route.surface,
              path: route.path,
              existingOwner,
            },
          }
        );
      }
      this.routeIndex.set(routeKey, moduleKey);
    }
  }
}
