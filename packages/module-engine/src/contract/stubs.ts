/**
 * @tmpr/module-engine - Architectural Stubs for Future Tasks
 * Typová rozhraní a stubs pro budoucí části Module Engine:
 * - Module Registry (F1-003) - implementováno
 * - Dependency Resolver & Cycle Detection (F1-004) - implementováno
 * - Lifecycle Engine (navazující samostatný task)
 * - Module Gates (pozdější task)
 */

export type { IModuleRegistry } from "../registry/registry.types.js";
export type { IDependencyResolver } from "../dependencies/dependency.types.js";

/**
 * STUB: Budoucí rozhraní pro Module Gates (Next.js middleware / NestJS guards) (pozdější task).
 */
export interface IModuleGate {
  isModuleEnabled(moduleKey: string): Promise<boolean>;
  assertModuleAccess(moduleKey: string, surface: "public" | "account" | "admin" | "api"): Promise<boolean>;
}
