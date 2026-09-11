/**
 * @tmpr/module-engine - Architectural Stubs for Future Tasks
 * Typová rozhraní a stubs pro budoucí části Module Engine:
 * - Module Registry (F1-003)
 * - Dependency Resolver & Cycle Detection (navazující samostatný task)
 * - Lifecycle Engine (navazující samostatný task)
 * - Module Gates (pozdější task)
 */

import type { IModuleManifest } from "./types.js";
export type { IModuleRegistry } from "../registry/registry.types.js";

/**
 * STUB: Budoucí rozhraní pro Dependency Resolver a detekci cyklů (navazující samostatný task).
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
 * STUB: Budoucí rozhraní pro Module Gates (Next.js middleware / NestJS guards) (pozdější task).
 */
export interface IModuleGate {
  isModuleEnabled(moduleKey: string): Promise<boolean>;
  assertModuleAccess(moduleKey: string, surface: "public" | "account" | "admin" | "api"): Promise<boolean>;
}
