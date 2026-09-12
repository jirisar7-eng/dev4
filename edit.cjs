const fs = require('fs');

const path = '/tmp/dev4/packages/module-engine/src/registry/registry.types.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
`  /**
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

  /**
   * Zaznamená aktualizaci stavu životního cyklu modulu (bez spouštění hooků).
   * Jediná autoritativní cesta pro změnu stavu v registru.
   */
  recordState(moduleKey: string, state: ModuleLifecycleState): void;

  /**
   * Zcela odregistruje modul z registru včetně smazání všech jeho rout z indexu.
   */
  unregister(moduleKey: string): void;

  /**
   * Odregistruje všechny deklarované routy daného modulu z route indexu.
   */
  unregisterRoutes(moduleKey: string): void;

  /**
   * Znovu zaregistruje deklarované routy modulu do route indexu.
   */
  registerRoutes(moduleKey: string): void;
}`,
`  /**
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
  registerRoutes(moduleKey: string): void;`
);

fs.writeFileSync(path, content, 'utf8');
