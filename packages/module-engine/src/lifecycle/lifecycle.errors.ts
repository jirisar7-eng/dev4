/**
 * @tmpr/module-engine - Module Lifecycle Typed Errors
 * Deterministické typované výjimky pro operace životního cyklu modulů.
 */

import type { ModuleLifecycleState } from "../contract/types.js";
import type { DependencyIssue } from "../dependencies/dependency.types.js";
import type { ModuleLifecycleTransition } from "./lifecycle.types.js";

/**
 * Kódy chyb životního cyklu modulu.
 */
export type ModuleLifecycleErrorCode =
  | "MODULE_NOT_REGISTERED"
  | "INVALID_TRANSITION"
  | "HOOK_FAILED"
  | "DEPENDENCY_BLOCKED"
  | "REQUIRED_DEPENDENCY_NOT_ENABLED"
  | "DEPENDENT_MODULES_ACTIVE";

/**
 * Metadata a kontext vyhozené výjimky ModuleLifecycleError.
 */
export interface ModuleLifecycleErrorOptions {
  readonly moduleKey?: string;
  readonly transition?: ModuleLifecycleTransition;
  readonly previousState?: ModuleLifecycleState;
  readonly targetState?: ModuleLifecycleState;
  readonly dependencyKey?: string;
  readonly blockers?: readonly DependencyIssue[];
  readonly dependentModules?: readonly string[];
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

/**
 * Autoritativní výjimka vyhazovaná ModuleLifecycleEngine při neplatném přechodu,
 * selhání hooku nebo blokaci závislostmi.
 */
export class ModuleLifecycleError extends Error {
  readonly code: ModuleLifecycleErrorCode;
  readonly moduleKey?: string;
  readonly transition?: ModuleLifecycleTransition;
  readonly previousState?: ModuleLifecycleState;
  readonly targetState?: ModuleLifecycleState;
  readonly dependencyKey?: string;
  readonly blockers?: readonly DependencyIssue[];
  readonly dependentModules?: readonly string[];
  readonly details?: Record<string, unknown>;

  constructor(
    code: ModuleLifecycleErrorCode,
    message: string,
    options?: ModuleLifecycleErrorOptions
  ) {
    super(message, { cause: options?.cause });
    this.name = "ModuleLifecycleError";
    this.code = code;
    this.moduleKey = options?.moduleKey;
    this.transition = options?.transition;
    this.previousState = options?.previousState;
    this.targetState = options?.targetState;
    this.dependencyKey = options?.dependencyKey;
    this.blockers = options?.blockers;
    this.dependentModules = options?.dependentModules;
    this.details = options?.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
