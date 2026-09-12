/**
 * @tmpr/module-engine - Architectural Stubs & Re-exports
 * Rozhraní a re-exporty autoritativních subsystémů Module Engine:
 * - Module Registry (F1-003) - implementováno
 * - Dependency Resolver & Cycle Detection (F1-004) - implementováno
 * - Route & API Module Gates (F1-005 / NEWDEV-13) - implementováno
 * - Lifecycle Engine (navazující úkol NEWDEV-16 / F1-006)
 */

export type { IModuleRegistry } from "../registry/registry.types.js";
export type { IDependencyResolver } from "../dependencies/dependency.types.js";
export type { IModuleGate } from "../gates/gate.types.js";
