/**
 * @tmpr/module-engine - Dependency Resolver Types & Interfaces
 * Autoritativní definice rozhraní a typů pro vyhodnocování závislostí a detekci cyklů (Synthesis OS).
 */

/**
 * Typové kódy zjištěných problémů se závislostmi.
 */
export type DependencyIssueCode =
  | "TARGET_NOT_REGISTERED"
  | "MISSING_REQUIRED_DEPENDENCY"
  | "REQUIRED_VERSION_INCOMPATIBLE"
  | "DEPENDENCY_CYCLE"
  | "OPTIONAL_DEPENDENCY_MISSING"
  | "OPTIONAL_VERSION_INCOMPATIBLE";

/**
 * Závažnost problému se závislostmi:
 * - blocker: kritická chyba bránící sestavení pořadí (ok = false, resolvedOrder = [])
 * - advisory: varování / doporučení pro volitelné závislosti (neblokuje aktivaci)
 */
export type DependencyIssueSeverity = "blocker" | "advisory";

/**
 * Strukturovaný popis zjištěného problému se závislostmi s přesnými metadaty.
 */
export interface DependencyIssue {
  readonly code: DependencyIssueCode;
  readonly severity: DependencyIssueSeverity;
  readonly message: string;
  readonly moduleKey: string;
  readonly dependencyKey?: string;
  readonly requiredRange?: string;
  readonly actualVersion?: string;
  readonly cycle?: readonly string[];
}

/**
 * Výsledek analýzy a vyřešení závislostí.
 */
export interface DependencyResolutionResult {
  /**
   * Zda je dependency graph validní (bez jakéhokoli blockeru).
   */
  readonly ok: boolean;
  /**
   * Deterministické topologické pořadí aktivace modulů (závislosti před závislými moduly).
   * Pokud existuje jakýkoli blocker, je vždy prázdné [].
   */
  readonly resolvedOrder: readonly string[];
  /**
   * Seznam blokujících chyb (chybějící/nekompatibilní required závislosti, cykly, neregistrovaný target).
   */
  readonly blockers: readonly DependencyIssue[];
  /**
   * Seznam neblokujících doporučení (chybějící/nekompatibilní optional závislosti).
   */
  readonly advisories: readonly DependencyIssue[];
  /**
   * Seznam detekovaných kanonických cyklů (např. [A, B, C, A]).
   */
  readonly cycles: readonly (readonly string[])[];
}

/**
 * Autoritativní rozhraní pro Dependency Resolver.
 */
export interface IDependencyResolver {
  /**
   * Analyzuje závislosti a sestaví pořadí pro cílový modul a jeho required dependency closure.
   */
  resolveFor(moduleKey: string): DependencyResolutionResult;

  /**
   * Analyzuje závislosti a sestaví globální pořadí pro všechny registrované moduly.
   */
  resolveAll(): DependencyResolutionResult;
}
