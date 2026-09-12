/**
 * @tmpr/module-engine - Lifecycle Module
 * Autoritativní exporty pro řízení životního cyklu modulů.
 */

export type {
  ModuleLifecycleTransition,
  LifecycleTransitionOptions,
  ModuleLifecycleTransitionResult,
  ModuleLifecycleEngineOptions,
  IModuleLifecycleEngine,
} from "./lifecycle.types.js";

export {
  ModuleLifecycleError,
  type ModuleLifecycleErrorCode,
  type ModuleLifecycleErrorOptions,
} from "./lifecycle.errors.js";

export { ModuleLifecycleEngine } from "./lifecycle.engine.js";
