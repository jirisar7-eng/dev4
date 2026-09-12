import type { IModuleRegistry } from "./registry.types.js";
import type { ModuleLifecycleState } from "../contract/types.js";

/**
 * Interní rozhraní pro mutaci registru. Nesmí být použito z klientského kódu.
 */
export interface IMutableModuleRegistry extends IModuleRegistry {
  recordState(moduleKey: string, state: ModuleLifecycleState): void;
  unregister(moduleKey: string): void;
  unregisterRoutes(moduleKey: string): void;
  registerRoutes(moduleKey: string): void;
}

/**
 * Privátní úložiště mutovatelných referencí pro registry.
 * Nesmí být nikdy exportováno z veřejného rozhraní.
 */
export const registryMutators = new WeakMap<IModuleRegistry, IMutableModuleRegistry>();
