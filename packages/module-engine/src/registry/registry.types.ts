/**
 * @tmpr/module-engine - Module Registry Types & Interfaces
 * Autoritativní typy registru modulů platformy Synthesis OS.
 */

import type { IModule, IModuleManifest, ModuleLifecycleState } from "../contract/types.js";

/**
 * Konfigurační volby předávané instanci ModuleRegistry při inicializaci.
 */
export interface ModuleRegistryOptions {
  /**
   * Běhová verze Synthesis Core (SemVer).
   */
  readonly synthesisCoreVersion: string;

  /**
   * Volitelná běhová verze Synthesis CMS (SemVer).
   * Povinné, pokud registrovaný modul deklaruje compatibility.synthesisCms.
   */
  readonly synthesisCmsVersion?: string;
}

/**
 * Autoritativní záznam registrovaného modulu v Module Registry.
 */
export interface IModuleRegistryRecord {
  /**
   * Kanonický namespaced identifikátor modulu (např. platform.auth).
   */
  readonly moduleKey: string;

  /**
   * Striktní SemVer verze modulu.
   */
  readonly version: string;

  /**
   * Aktuální stav životního cyklu modulu.
   * Po registraci je vždy "uninstalled".
   */
  state: ModuleLifecycleState;

  /**
   * Validovaný a typovaný manifest modulu.
   */
  readonly manifest: IModuleManifest;

  /**
   * Běhová instance modulu.
   */
  readonly module: IModule;

  /**
   * ISO 8601 časové razítko registrace modulu.
   */
  readonly registeredAt: string;
}

/**
 * Veřejné rozhraní pro Module Registry.
 */
export interface IModuleRegistry {
  /**
   * Zaregistruje modul do registru po striktní validaci manifestu,
   * platformní kompatibility a vyloučení duplicit a konfliktů rout.
   */
  register(module: IModule): void;

  /**
   * Vrátí běhovou instanci modulu dle moduleKey nebo undefined.
   */
  get(moduleKey: string): IModule | undefined;

  /**
   * Vrátí seznam všech registrovaných běhových modulů.
   */
  list(): readonly IModule[];

  /**
   * Zjistí, zda je modul s daným moduleKey registrován.
   */
  has(moduleKey: string): boolean;

  /**
   * Vrátí detailní záznam modulu (IModuleRegistryRecord) dle moduleKey nebo undefined.
   */
  getRecord(moduleKey: string): IModuleRegistryRecord | undefined;

  /**
   * Vrátí seznam všech detailních záznamů registrovaných modulů.
   */
  listRecords(): readonly IModuleRegistryRecord[];

  /**
   * Vrátí moduleKey modulu, který vlastní danou kombinaci surface a path.
   */
  getRouteOwner(surface: string, path: string): string | undefined;

  /**
   * Zaznamená aktualizaci stavu životního cyklu modulu (bez spouštění hooků).
   */
  recordState(moduleKey: string, state: ModuleLifecycleState): void;
}
