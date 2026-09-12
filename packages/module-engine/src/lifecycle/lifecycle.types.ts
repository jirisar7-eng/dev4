/**
 * @tmpr/module-engine - Module Lifecycle Types
 * Autoritativní typy a rozhraní pro řízení životního cyklu modulů Synthesis OS.
 */

import type {
  IModuleLifecycleContext,
  ModuleLifecycleState,
} from "../contract/types.js";
import type { IModuleRegistryRecord } from "../registry/registry.types.js";

/**
 * Podporované akce / přechody životního cyklu modulu.
 */
export type ModuleLifecycleTransition =
  | "install"
  | "enable"
  | "disable"
  | "uninstall";

/**
 * Volitelné parametry předávané do operace přechodu stavu.
 */
export interface LifecycleTransitionOptions {
  /**
   * Běhové prostředí předávané do kontextu modulu.
   * Výchozí: 'test' nebo hodnota z konfigurace engine.
   */
  readonly environment?: "development" | "production" | "test";

  /**
   * Volitelný custom logger předávaný do kontextu lifecycle hooků.
   */
  readonly logger?: IModuleLifecycleContext["logger"];

  /**
   * Vynucená deaktivace / odinstalace i v případě, že na modulu závisí jiné moduly.
   * Výchozí: false (fail-closed, blokováno při existenci aktivních závislostí).
   */
  readonly force?: boolean;

  /**
   * Zda při odinstalaci provést také úplné vyřazení z registru (odstranění záznamu a rout).
   * Výchozí: false (ponechá modul ve stavu 'uninstalled' pro možnost re-instalace).
   */
  readonly unregister?: boolean;
}

/**
 * Strukturovaný výsledek operace životního cyklu modulu.
 */
export interface ModuleLifecycleTransitionResult {
  /**
   * Zda operace skončila úspěchem.
   */
  readonly success: boolean;

  /**
   * Klíč cílového modulu.
   */
  readonly moduleKey: string;

  /**
   * Původní stav před operací.
   */
  readonly previousState: ModuleLifecycleState;

  /**
   * Výsledný stav po operaci.
   */
  readonly newState: ModuleLifecycleState;

  /**
   * Typ provedeného přechodu.
   */
  readonly transition: ModuleLifecycleTransition;

  /**
   * ISO 8601 časové razítko dokončení operace.
   */
  readonly timestamp: string;

  /**
   * Doplňující metadata operace.
   */
  readonly details?: Record<string, unknown>;
}

/**
 * Konfigurační volby předávané do konstruktoru ModuleLifecycleEngine.
 */
export interface ModuleLifecycleEngineOptions {
  /**
   * Výchozí prostředí pro kontext hooků (výchozí: 'test').
   */
  readonly defaultEnvironment?: "development" | "production" | "test";

  /**
   * Výchozí logger pro lifecycle kontext.
   */
  readonly defaultLogger?: IModuleLifecycleContext["logger"];
}

/**
 * Autoritativní rozhraní pro Module Lifecycle Engine.
 * Řídí přechody stavů modulů, spouští hooky a synchronizuje autoritativní stav s Module Registry.
 */
export interface IModuleLifecycleEngine {
  /**
   * Provede instalaci modulu.
   * Přechod: uninstalled -> installed (nebo z failed při recovery).
   * Spouští IModule.onInstall().
   */
  install(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult>;

  /**
   * Aktivuje modul do provozu.
   * Přechod: installed -> enabled, nebo disabled -> enabled (nebo z failed při recovery).
   * Validuje závislosti (všechny required dependencies musí být vyřešeny a ve stavu 'enabled').
   * Spouští IModule.onEnable().
   */
  enable(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult>;

  /**
   * Deaktivuje běžící modul.
   * Přechod: enabled -> disabled (nebo z failed při recovery).
   * Ověřuje, zda na modulu nezávisí jiné aktivní moduly (fail-closed).
   * Spouští IModule.onDisable().
   */
  disable(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult>;

  /**
   * Odinstaluje modul.
   * Přechod: enabled/disabled/installed -> uninstalled (nebo z failed při recovery).
   * Pokud byl modul enabled, nejprve bezpečně provede de-aktivaci (onDisable).
   * Spouští IModule.onUninstall(), provádí úklid a resetuje stav.
   */
  uninstall(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult>;

  /**
   * Generický přechod stavu podle typu operace.
   */
  transition(
    moduleKey: string,
    transition: ModuleLifecycleTransition,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult>;

  /**
   * Získá aktuální stav modulu přímo z autoritativního registru.
   */
  getState(moduleKey: string): ModuleLifecycleState;

  /**
   * Získá snapshot záznamu modulu z autoritativního registru.
   */
  getRecord(moduleKey: string): IModuleRegistryRecord | undefined;

  /**
   * Odregistruje modul z registru a odstraní jeho routy.
   */
  unregister(moduleKey: string): void;
}
