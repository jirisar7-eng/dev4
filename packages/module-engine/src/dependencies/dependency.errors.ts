/**
 * @tmpr/module-engine - Dependency Resolver Error & Issue Factories
 * Pomocné továrny na strukturované problémy (issues) a chyby resolveru závislostí.
 */

import type {
  DependencyIssue
} from "./dependency.types.js";

/**
 * Běhová chyba Dependency Resolveru (používá se při nevalidním vstupu, např. chybějící registry).
 */
export class DependencyResolverError extends Error {
  public readonly code: string;

  constructor(message: string, code = "DEPENDENCY_RESOLVER_ERROR") {
    super(message);
    this.name = "DependencyResolverError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Vytvoří blocker issue pro neregistrovaný cílový modul v resolveFor().
 */
export function createTargetNotRegisteredIssue(moduleKey: string): DependencyIssue {
  return {
    code: "TARGET_NOT_REGISTERED",
    severity: "blocker",
    message: `Target module '${moduleKey}' is not registered in Module Registry`,
    moduleKey
  };
}

/**
 * Vytvoří blocker issue pro chybějící povinnou závislost.
 */
export function createMissingRequiredDependencyIssue(
  moduleKey: string,
  dependencyKey: string,
  requiredRange: string
): DependencyIssue {
  return {
    code: "MISSING_REQUIRED_DEPENDENCY",
    severity: "blocker",
    message: `Module '${moduleKey}' requires dependency '${dependencyKey}' (${requiredRange}), but it is not registered`,
    moduleKey,
    dependencyKey,
    requiredRange
  };
}

/**
 * Vytvoří blocker issue pro nekompatibilní verzi povinné závislosti.
 */
export function createRequiredVersionIncompatibleIssue(
  moduleKey: string,
  dependencyKey: string,
  requiredRange: string,
  actualVersion: string
): DependencyIssue {
  return {
    code: "REQUIRED_VERSION_INCOMPATIBLE",
    severity: "blocker",
    message: `Module '${moduleKey}' requires '${dependencyKey}' with version range '${requiredRange}', but registered version is '${actualVersion}'`,
    moduleKey,
    dependencyKey,
    requiredRange,
    actualVersion
  };
}

/**
 * Vytvoří blocker issue pro detekovaný cyklus v povinných závislostech.
 */
export function createDependencyCycleIssue(cycle: readonly string[]): DependencyIssue {
  const rootNode = cycle[0] ?? "";
  return {
    code: "DEPENDENCY_CYCLE",
    severity: "blocker",
    message: `Dependency cycle detected: ${cycle.join(" -> ")}`,
    moduleKey: rootNode,
    cycle
  };
}

/**
 * Vytvoří advisory issue pro chybějící volitelnou závislost.
 */
export function createOptionalDependencyMissingIssue(
  moduleKey: string,
  dependencyKey: string,
  requiredRange: string
): DependencyIssue {
  return {
    code: "OPTIONAL_DEPENDENCY_MISSING",
    severity: "advisory",
    message: `Module '${moduleKey}' declares optional dependency '${dependencyKey}' (${requiredRange}), which is not registered`,
    moduleKey,
    dependencyKey,
    requiredRange
  };
}

/**
 * Vytvoří advisory issue pro nekompatibilní verzi volitelné závislosti.
 */
export function createOptionalVersionIncompatibleIssue(
  moduleKey: string,
  dependencyKey: string,
  requiredRange: string,
  actualVersion: string
): DependencyIssue {
  return {
    code: "OPTIONAL_VERSION_INCOMPATIBLE",
    severity: "advisory",
    message: `Module '${moduleKey}' declares optional dependency '${dependencyKey}' with version range '${requiredRange}', but registered version is '${actualVersion}'`,
    moduleKey,
    dependencyKey,
    requiredRange,
    actualVersion
  };
}
