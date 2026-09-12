/**
 * @tmpr/module-engine - Module Registry Types & Interfaces
 * Autoritativní typy registru modulů platformy Synthesis OS.
 */

import type { IModule, IModuleManifest, ModuleLifecycleState } from "../contract/types.js";

/**
 * Rekurzivní typ pro hluboce neměnná data (deep read-only).
 * Zabraňuje jakékoli přímé mutaci vnořených polí a objektů bez explicitního unsafe castu.
 */
export type DeepReadonly<T> = T extends Function | boolean | number | string | symbol | bigint | null | undefined
  ? T
  : T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends readonly (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

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
 * Autoritativní veřejný read-only záznam registrovaného modulu v Module Registry.
 * Všechny vlastnosti včetně state a vnořeného manifestu jsou hluboce read-only.
 * Změny stavu lze provádět výhradně přes autoritativní API recordState().
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
   * Read-only pohled. Změny stavu lze provádět výhradně přes autoritativní API recordState().
   */
  readonly state: ModuleLifecycleState;

  /**
   * Validovaný, hluboce neměnný manifest modulu.
   * Veškerá vnořená pole i objekty jsou zmrazeny a read-only.
   */
  readonly manifest: DeepReadonly<IModuleManifest>;

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
   * Vrátí bezpečný read-only snapshot záznamu modulu (IModuleRegistryRecord) dle moduleKey nebo undefined.
   * Změna vráceného snapshotu ani jeho vnořeného manifestu neovlivní interní stav registru.
   */
  getRecord(moduleKey: string): IModuleRegistryRecord | undefined;

  /**
   * Vrátí seznam bezpečných read-only snapshotů všech registrovaných modulů.
   * Změna prvků pole ani vnořených manifestů neovlivní interní stav registru.
   */
  listRecords(): readonly IModuleRegistryRecord[];

  /**
   * Vrátí moduleKey modulu, který vlastní danou kombinaci surface a path.
   */
  getRouteOwner(surface: string, path: string): string | undefined;
}

/**
 * Interní rozhraní pro mutaci registru. Nesmí být použito z klientského kódu.
 */
export interface IMutableModuleRegistry extends IModuleRegistry {
  recordState(moduleKey: string, state: ModuleLifecycleState): void;
  unregister(moduleKey: string): void;
  unregisterRoutes(moduleKey: string): void;
  registerRoutes(moduleKey: string): void;
}
