/**
 * @tmpr/module-engine - Module Gate Types
 * Autoritativní typy a kontrakty pro vyhodnocování dostupnosti modulů, surfaces a rout.
 */

import type { ModuleLifecycleState } from "../contract/types.js";
import type { DependencyIssue } from "../dependencies/dependency.types.js";

/**
 * Podporované aplikační a API surfaces.
 */
export type ModuleGateSurface = "public" | "account" | "admin" | "api";

/**
 * Kódy rozhodnutí Module Gate.
 */
export type ModuleGateDecisionCode =
  | "ALLOW"
  | "MODULE_NOT_REGISTERED"
  | "MODULE_NOT_ENABLED"
  | "SURFACE_NOT_ENABLED"
  | "ROUTE_NOT_REGISTERED"
  | "DEPENDENCY_BLOCKED"
  | "REQUIRED_DEPENDENCY_NOT_ENABLED";

/**
 * Strukturovaný výsledek rozhodnutí Module Gate.
 */
export interface ModuleGateDecision {
  /**
   * Zda je přístup povolen (true) či zamítnut (false).
   */
  readonly allowed: boolean;

  /**
   * Kód rozhodnutí (ALLOW nebo specifický důvod zamítnutí).
   */
  readonly code: ModuleGateDecisionCode;

  /**
   * Klíč cílového modulu (pokud je znám).
   */
  readonly moduleKey?: string;

  /**
   * Surface, pro kterou bylo rozhodnutí vyhodnoceno.
   */
  readonly surface?: ModuleGateSurface;

  /**
   * Cesta routy, pro kterou bylo rozhodnutí vyhodnoceno.
   */
  readonly path?: string;

  /**
   * Aktuální runtime stav modulu z registru (pokud je modul registrován).
   */
  readonly state?: ModuleLifecycleState;

  /**
   * Seznam blokujících chyb v závislostech (při DEPENDENCY_BLOCKED).
   */
  readonly dependencyBlockers?: readonly DependencyIssue[];

  /**
   * Klíč povinné závislosti, která není ve stavu "enabled".
   */
  readonly requiredDependencyKey?: string;

  /**
   * Stav povinné závislosti, která zabránila přístupu.
   */
  readonly requiredDependencyState?: ModuleLifecycleState;

  /**
   * Metadata z manifestu vlastníka routy: vyžaduje autentizaci uživatele.
   */
  readonly requiresAuth?: boolean;

  /**
   * Metadata z manifestu vlastníka routy: požadované oprávnění (např. "admin:access").
   */
  readonly requiredPermission?: string;
}

/**
 * Autoritativní rozhraní pro Module Gate (Synthesis OS / Platform Services).
 * Framework-independent gatekeeper pro vyhodnocování dostupnosti modulů, surfaces a rout.
 */
export interface IModuleGate {
  /**
   * Rychlá kontrola, zda je modul registrován, ve stavu "enabled" a má splněny všechny povinné závislosti.
   */
  isModuleEnabled(moduleKey: string): Promise<boolean>;

  /**
   * Ověří přístup k modulu na dané surface. Pokud není povolen, vyhodí výjimku ModuleGateError.
   */
  assertModuleAccess(moduleKey: string, surface: ModuleGateSurface): Promise<boolean>;

  /**
   * Vyhodnotí přístup k modulu na dané surface a vrátí detailní rozhodnutí (fail-closed).
   */
  evaluateModuleAccess(moduleKey: string, surface?: ModuleGateSurface): Promise<ModuleGateDecision>;

  /**
   * Vyhodnotí přístup k dané routě na dané surface podle vlastníka z Module Registry.
   */
  evaluateRouteAccess(surface: ModuleGateSurface, path: string): Promise<ModuleGateDecision>;
}
