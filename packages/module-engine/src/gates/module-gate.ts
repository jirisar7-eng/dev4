/**
 * @tmpr/module-engine - Module Gate
 * Autoritativní, framework-independent implementace IModuleGate.
 */

import type { IModuleRegistry } from "../registry/registry.types.js";
import type { IDependencyResolver } from "../dependencies/dependency.types.js";
import type {
  IModuleGate,
  ModuleGateDecision,
  ModuleGateSurface,
} from "./gate.types.js";
import { ModuleGateError } from "./gate.errors.js";

export class ModuleGate implements IModuleGate {
  private readonly registry: IModuleRegistry;
  private readonly resolver: IDependencyResolver;

  constructor(registry: IModuleRegistry, resolver: IDependencyResolver) {
    this.registry = registry;
    this.resolver = resolver;
  }

  /**
   * Synchronní vyhodnocení dostupnosti modulu (volitelně na dané surface).
   */
  public evaluateModuleAccessSync(
    moduleKey: string,
    surface?: ModuleGateSurface
  ): ModuleGateDecision {
    const record = this.registry.getRecord(moduleKey);
    if (!record) {
      return {
        allowed: false,
        code: "MODULE_NOT_REGISTERED",
        moduleKey,
        surface,
      };
    }

    if (record.state !== "enabled") {
      return {
        allowed: false,
        code: "MODULE_NOT_ENABLED",
        moduleKey,
        surface,
        state: record.state,
      };
    }

    // Vyhodnocení strukturálních závislostí
    const resolution = this.resolver.resolveFor(moduleKey);
    if (!resolution.ok) {
      return {
        allowed: false,
        code: "DEPENDENCY_BLOCKED",
        moduleKey,
        surface,
        state: record.state,
        dependencyBlockers: resolution.blockers,
      };
    }

    // Defense-in-depth: všechny required závislosti musí být v registru ve stavu "enabled"
    for (const depKey of resolution.resolvedOrder) {
      if (depKey === moduleKey) {
        continue;
      }
      const depRecord = this.registry.getRecord(depKey);
      if (!depRecord || depRecord.state !== "enabled") {
        return {
          allowed: false,
          code: "REQUIRED_DEPENDENCY_NOT_ENABLED",
          moduleKey,
          surface,
          state: record.state,
          requiredDependencyKey: depKey,
          requiredDependencyState: depRecord?.state,
        };
      }
    }

    // Kontrola surface, pokud byla specifikována
    if (surface) {
      let surfaceEnabled = false;
      if (surface === "api") {
        surfaceEnabled = record.manifest.surfaces.api.enabled === true;
      } else {
        surfaceEnabled = record.manifest.surfaces.ui[surface]?.enabled === true;
      }

      if (!surfaceEnabled) {
        return {
          allowed: false,
          code: "SURFACE_NOT_ENABLED",
          moduleKey,
          surface,
          state: record.state,
        };
      }
    }

    return {
      allowed: true,
      code: "ALLOW",
      moduleKey,
      surface,
      state: record.state,
    };
  }

  /**
   * Synchronní vyhodnocení přístupu k dané routě na dané surface.
   */
  public evaluateRouteAccessSync(
    surface: ModuleGateSurface,
    path: string
  ): ModuleGateDecision {
    const ownerModuleKey = this.registry.getRouteOwner(surface, path);
    if (!ownerModuleKey) {
      return {
        allowed: false,
        code: "ROUTE_NOT_REGISTERED",
        surface,
        path,
      };
    }

    // Vyhodnotíme přístup k modulu a surface
    const moduleDecision = this.evaluateModuleAccessSync(ownerModuleKey, surface);

    // Dohledáme deklaraci routy v manifestu pro metadata
    const record = this.registry.getRecord(ownerModuleKey);
    const routeDef = record?.manifest.routes.find(
      (r) => r.surface === surface && r.path === path
    );

    if (!moduleDecision.allowed) {
      return {
        ...moduleDecision,
        path,
        requiresAuth: routeDef?.requiresAuth,
        requiredPermission: routeDef?.permission,
      };
    }

    return {
      allowed: true,
      code: "ALLOW",
      moduleKey: ownerModuleKey,
      surface,
      path,
      state: moduleDecision.state,
      requiresAuth: routeDef?.requiresAuth,
      requiredPermission: routeDef?.permission,
    };
  }

  public async evaluateModuleAccess(
    moduleKey: string,
    surface?: ModuleGateSurface
  ): Promise<ModuleGateDecision> {
    return this.evaluateModuleAccessSync(moduleKey, surface);
  }

  public async evaluateRouteAccess(
    surface: ModuleGateSurface,
    path: string
  ): Promise<ModuleGateDecision> {
    return this.evaluateRouteAccessSync(surface, path);
  }

  public async isModuleEnabled(moduleKey: string): Promise<boolean> {
    const decision = this.evaluateModuleAccessSync(moduleKey);
    return decision.allowed;
  }

  public async assertModuleAccess(
    moduleKey: string,
    surface: ModuleGateSurface
  ): Promise<boolean> {
    const decision = this.evaluateModuleAccessSync(moduleKey, surface);
    if (!decision.allowed) {
      throw new ModuleGateError(decision);
    }
    return true;
  }
}
