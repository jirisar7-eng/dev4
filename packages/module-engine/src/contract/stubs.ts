/**
 * @tmpr/module-engine - Architectural Stubs for Future Tasks
 * Typová rozhraní a stubs pro budoucí části Module Engine:
 * - Module Registry
 * - Dependency Resolver & Cycle Detection
 * - Lifecycle Engine
 * - Module Gates
 *
 * POZNÁMKA: Tyto části nejsou v F1-002 implementovány jako hotové,
 * jsou připraveny pro navazující úkoly F1-003+.
 */

import type { IModule, IModuleManifest } from "./types.js";

/**
 * STUB: Budoucí rozhraní pro registr modulů (bude implementováno v F1-003).
 */
export interface IModuleRegistry {
  register(module: IModule): void;
  get(moduleKey: string): IModule | undefined;
  list(): readonly IModule[];
  has(moduleKey: string): boolean;
}

/**
 * STUB: Budoucí rozhraní pro Dependency Resolver a detekci cyklů (F1-003).
 */
export interface IDependencyResolver {
  resolveOrder(manifests: readonly IModuleManifest[]): {
    readonly resolvedOrder: readonly string[];
    readonly missingDependencies: readonly string[];
    readonly hasCycles: boolean;
    readonly cycles: readonly string[][];
  };
}

/**
 * STUB: Budoucí rozhraní pro Module Gates (Next.js middleware / NestJS guards) (F1-004).
 */
export interface IModuleGate {
  isModuleEnabled(moduleKey: string): Promise<boolean>;
  assertModuleAccess(moduleKey: string, surface: "public" | "account" | "admin" | "api"): Promise<boolean>;
}
