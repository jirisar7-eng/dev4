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
 */

import semver from "semver";
import { safeValidateModuleManifest } from "../contract/validator.js";
import { isValidSemver } from "../contract/manifest.schema.js";
import type { IModule, ModuleLifecycleState } from "../contract/types.js";
import type {
  IModuleRegistry,
  IModuleRegistryRecord,
  ModuleRegistryOptions
} from "./registry.types.js";
import { ModuleRegistryError } from "./registry.errors.js";

export class ModuleRegistry implements IModuleRegistry {
  private readonly options: ModuleRegistryOptions;
  private readonly records = new Map<string, IModuleRegistryRecord>();
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

    const manifest = validation.data;
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

    const record: IModuleRegistryRecord = {
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
   * Vrátí modul dle jeho moduleKey nebo undefined.
   */
  public get(moduleKey: string): IModule | undefined {
    return this.records.get(moduleKey)?.module;
  }

  /**
   * Vrátí seznam všech registrovaných modulů.
   */
  public list(): readonly IModule[] {
    return Array.from(this.records.values()).map((r) => r.module);
  }

  /**
   * Zjistí přítomnost modulu v registru.
   */
  public has(moduleKey: string): boolean {
    return this.records.has(moduleKey);
  }

  /**
   * Vrátí autoritativní záznam registru pro daný modul.
   */
  public getRecord(moduleKey: string): IModuleRegistryRecord | undefined {
    return this.records.get(moduleKey);
  }

  /**
   * Vrátí seznam všech autoritativních záznamů registru.
   */
  public listRecords(): readonly IModuleRegistryRecord[] {
    return Array.from(this.records.values());
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
}
