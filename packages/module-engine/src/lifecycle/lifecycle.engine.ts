/**
 * @tmpr/module-engine - Module Lifecycle Engine
 * Autoritativní orchestrátor životního cyklu modulů Synthesis OS.
 *
 * Garance:
 * - Registry zůstává autoritativním zdrojem pravdy o stavu modulů
 * - Žádné neautorizované obcházení stavového automatu
 * - Neplatný stavový přechod = fail-closed (výjimka INVALID_TRANSITION, stav nezměněn)
 * - Selhání hooku = fail-closed (nastavení stavu "failed", žádný falešný úspěch)
 * - Striktní kontrola závislostí před aktivací (enable) i deaktivací/odinstalací
 * - Zajištění úklidu a absence orphan registrací po odinstalaci
 */

import type {
  IModuleLifecycleContext,
  ModuleLifecycleState,
} from "../contract/types.js";
import type {
  IModuleRegistry,
  IMutableModuleRegistry,
  IModuleRegistryRecord,
} from "../registry/registry.types.js";
import type { IDependencyResolver } from "../dependencies/dependency.types.js";
import { DependencyResolver } from "../dependencies/dependency-resolver.js";
import type { IModuleGate } from "../gates/gate.types.js";
import { ModuleGate } from "../gates/module-gate.js";
import type {
  IModuleLifecycleEngine,
  LifecycleTransitionOptions,
  ModuleLifecycleEngineOptions,
  ModuleLifecycleTransition,
  ModuleLifecycleTransitionResult,
} from "./lifecycle.types.js";
import { ModuleLifecycleError } from "./lifecycle.errors.js";

/**
 * Matice povolených výchozích stavů pro jednotlivé operace.
 */
const ALLOWED_PREVIOUS_STATES: Record<
  ModuleLifecycleTransition,
  readonly ModuleLifecycleState[]
> = {
  install: ["uninstalled"],
  enable: ["installed", "disabled"],
  disable: ["enabled"],
  uninstall: ["installed", "disabled", "enabled", "failed"],
};

/**
 * Cílový stav po úspěšném provedení dané operace.
 */
const TARGET_STATES: Record<ModuleLifecycleTransition, ModuleLifecycleState> = {
  install: "installed",
  enable: "enabled",
  disable: "disabled",
  uninstall: "uninstalled",
};

/**
 * Vytvoří výchozí tichý logger pro běhový kontext.
 */
function createDefaultLogger(): IModuleLifecycleContext["logger"] {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

export class ModuleLifecycleEngine implements IModuleLifecycleEngine {
  private readonly mutableRegistry: IMutableModuleRegistry;
  public readonly registry: IModuleRegistry;
  public readonly resolver: IDependencyResolver;
  public readonly gate: IModuleGate;
  private readonly options: ModuleLifecycleEngineOptions;

  constructor(
    registry: IMutableModuleRegistry,
    resolver?: IDependencyResolver,
    gate?: IModuleGate,
    options?: ModuleLifecycleEngineOptions
  ) {
    this.mutableRegistry = registry;
    this.registry = registry;
    this.resolver = resolver ?? new DependencyResolver(registry);
    this.gate = gate ?? new ModuleGate(this.registry, this.resolver);
    this.options = { ...options };
  }

  /**
   * Získá aktuální stav modulu přímo z autoritativního registru.
   */
  public getState(moduleKey: string): ModuleLifecycleState {
    const record = this.registry.getRecord(moduleKey);
    if (!record) {
      throw new ModuleLifecycleError(
        "MODULE_NOT_REGISTERED",
        `Cannot get state for module '${moduleKey}': module is not registered in registry`,
        { moduleKey }
      );
    }
    return record.state;
  }

  /**
   * Získá snapshot záznamu modulu z autoritativního registru.
   */
  public getRecord(moduleKey: string): IModuleRegistryRecord | undefined {
    return this.registry.getRecord(moduleKey);
  }


  /**
   * Provede inicializační instalaci modulu.
   * uninstalled -> installed (nebo z failed při recovery).
   */
  public async install(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult> {
    return this.transition(moduleKey, "install", options);
  }

  /**
   * Aktivuje modul do provozu.
   * installed/disabled -> enabled (nebo z failed při recovery).
   */
  public async enable(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult> {
    return this.transition(moduleKey, "enable", options);
  }

  /**
   * Deaktivuje běžící modul.
   * enabled -> disabled (nebo z failed při recovery).
   */
  public async disable(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult> {
    return this.transition(moduleKey, "disable", options);
  }

  /**
   * Odinstaluje modul.
   * installed/disabled/enabled -> uninstalled (nebo z failed při recovery).
   */
  public async uninstall(
    moduleKey: string,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult> {
    return this.transition(moduleKey, "uninstall", options);
  }

  /**
   * Centrální autoritativní metoda pro provádění stavových přechodů.
   */
  public async transition(
    moduleKey: string,
    transition: ModuleLifecycleTransition,
    options?: LifecycleTransitionOptions
  ): Promise<ModuleLifecycleTransitionResult> {
    // 1. Ověření registrace modulu
    const record = this.registry.getRecord(moduleKey);
    if (!record) {
      throw new ModuleLifecycleError(
        "MODULE_NOT_REGISTERED",
        `Cannot perform transition '${transition}' for module '${moduleKey}': module is not registered in registry`,
        { moduleKey, transition }
      );
    }

    const previousState = record.state;
    const targetState = TARGET_STATES[transition];

    // 2. Validace přípustnosti stavového přechodu (Fail-closed)
    const allowedPrevious = ALLOWED_PREVIOUS_STATES[transition];
    if (!allowedPrevious.includes(previousState)) {
      const message = this.buildInvalidTransitionMessage(
        moduleKey,
        transition,
        previousState
      );
      throw new ModuleLifecycleError("INVALID_TRANSITION", message, {
        moduleKey,
        transition,
        previousState,
        targetState,
      });
    }

    // 3. Kontrola závislostí podle typu přechodu
    if (transition === "enable") {
      this.validateEnableDependencies(moduleKey);
    } else if (transition === "disable") {
      this.validateDisableDependentModules(moduleKey);
    } else if (transition === "uninstall") {
      this.validateUninstallDependentModules(moduleKey);
    }

    // 4. Sestavení kontextu pro lifecycle hooky
    const context: IModuleLifecycleContext = {
      moduleKey,
      version: record.version,
      environment:
        options?.environment ?? this.options.defaultEnvironment ?? "test",
      logger:
        options?.logger ?? this.options.defaultLogger ?? createDefaultLogger(),
    };

    // 5. Provedení hooků s přísnou ochranou proti falešnému úspěchu
    // Pokud byl modul ve stavu 'enabled' a je odinstalováván, nejprve bezpečně spustíme de-aktivaci
    if (transition === "uninstall" && previousState === "enabled") {
      try {
        if (typeof record.module.onDisable === "function") {
          await record.module.onDisable(context);
        }
      } catch (err) {
        // Selhání onDisable při uninstall zanechá modul ve stavu 'failed'
        this.mutableRegistry.recordState(moduleKey, "failed");
        throw new ModuleLifecycleError(
          "HOOK_FAILED",
          `onDisable teardown hook failed during uninstall of module '${moduleKey}': ${err instanceof Error ? err.message : String(err)}`,
          {
            moduleKey,
            transition,
            previousState,
            targetState: "failed",
            cause: err,
          }
        );
      }
    }

    // Spuštění primárního hooku
    try {
      if (
        transition === "install" &&
        typeof record.module.onInstall === "function"
      ) {
        await record.module.onInstall(context);
      } else if (
        transition === "enable" &&
        typeof record.module.onEnable === "function"
      ) {
        await record.module.onEnable(context);
      } else if (
        transition === "disable" &&
        typeof record.module.onDisable === "function"
      ) {
        await record.module.onDisable(context);
      } else if (
        transition === "uninstall" &&
        typeof record.module.onUninstall === "function"
      ) {
        await record.module.onUninstall(context);
      }
    } catch (err) {
      // Selhání hooku: nastavíme autoritativní stav na 'failed', žádný falešný úspěšný stav!
      this.mutableRegistry.recordState(moduleKey, "failed");
      throw new ModuleLifecycleError(
        "HOOK_FAILED",
        `Lifecycle hook for transition '${transition}' failed for module '${moduleKey}': ${err instanceof Error ? err.message : String(err)}`,
        {
          moduleKey,
          transition,
          previousState,
          targetState: "failed",
          cause: err,
        }
      );
    }

    // 6. Úspěšné dokončení: záznam nového stavu do autoritativního registru
    this.mutableRegistry.recordState(moduleKey, targetState);

    // 7. Volitelné kompletní vyřazení z registru při uninstall (žádné orphan registrace)
    if (transition === "uninstall" && options?.unregister === true) {
      this.mutableRegistry.unregister(moduleKey);
    }

    return {
      success: true,
      moduleKey,
      previousState,
      newState: targetState,
      transition,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Zkontroluje vyřešení a aktivní stav všech povinných závislostí před přechodem do 'enabled'.
   */
  private validateEnableDependencies(moduleKey: string): void {
    const resolution = this.resolver.resolveFor(moduleKey);
    if (!resolution.ok) {
      throw new ModuleLifecycleError(
        "DEPENDENCY_BLOCKED",
        `Cannot enable module '${moduleKey}': dependency resolution failed with ${resolution.blockers.length} blocker(s)`,
        {
          moduleKey,
          transition: "enable",
          blockers: resolution.blockers,
        }
      );
    }

    // Každá požadovaná závislost musí být v registru a ve stavu 'enabled'
    for (const depKey of resolution.resolvedOrder) {
      if (depKey === moduleKey) {
        continue;
      }
      const depRecord = this.registry.getRecord(depKey);
      if (!depRecord || depRecord.state !== "enabled") {
        throw new ModuleLifecycleError(
          "REQUIRED_DEPENDENCY_NOT_ENABLED",
          `Cannot enable module '${moduleKey}': required dependency '${depKey}' is not enabled (current state: '${depRecord?.state ?? "not_registered"}')`,
          {
            moduleKey,
            transition: "enable",
            dependencyKey: depKey,
            details: {
              actualState: depRecord?.state ?? "not_registered",
            },
          }
        );
      }
    }
  }

  /**
   * Zkontroluje, zda na deaktivovaném modulu nezávisí jiné běžící (enabled) moduly.
   */
  private validateDisableDependentModules(moduleKey: string): void {
    const dependentModules: string[] = [];
    for (const otherRecord of this.registry.listRecords()) {
      if (otherRecord.moduleKey === moduleKey || otherRecord.state !== "enabled") {
        continue;
      }
      const isRequired = otherRecord.manifest.dependencies.required.some(
        (r) => r.moduleKey === moduleKey
      );
      if (isRequired) {
        dependentModules.push(otherRecord.moduleKey);
      }
    }

    if (dependentModules.length > 0) {
      throw new ModuleLifecycleError(
        "DEPENDENT_MODULES_ACTIVE",
        `Cannot disable module '${moduleKey}': active enabled module(s) [${dependentModules.join(", ")}] depend on it`,
        {
          moduleKey,
          transition: "disable",
          dependentModules,
        }
      );
    }
  }

  /**
   * Zkontroluje, zda na odinstalovávaném modulu nezávisí jiné instalované/běžící moduly.
   */
  private validateUninstallDependentModules(moduleKey: string): void {
    const dependentModules: string[] = [];
    for (const otherRecord of this.registry.listRecords()) {
      if (
        otherRecord.moduleKey === moduleKey ||
        otherRecord.state === "uninstalled"
      ) {
        continue;
      }
      const isRequired = otherRecord.manifest.dependencies.required.some(
        (r) => r.moduleKey === moduleKey
      );
      if (isRequired) {
        dependentModules.push(otherRecord.moduleKey);
      }
    }

    if (dependentModules.length > 0) {
      throw new ModuleLifecycleError(
        "DEPENDENT_MODULES_ACTIVE",
        `Cannot uninstall module '${moduleKey}': registered module(s) [${dependentModules.join(", ")}] depend on it`,
        {
          moduleKey,
          transition: "uninstall",
          dependentModules,
        }
      );
    }
  }

  /**
   * Vygeneruje srozumitelnou a deterministickou chybovou zprávu pro neplatný stavový přechod.
   */
  private buildInvalidTransitionMessage(
    moduleKey: string,
    transition: ModuleLifecycleTransition,
    currentState: ModuleLifecycleState
  ): string {
    switch (transition) {
      case "install":
        if (currentState === "installed") {
          return `Cannot install module '${moduleKey}': module is already installed`;
        }
        if (currentState === "enabled") {
          return `Cannot install module '${moduleKey}': module is already enabled`;
        }
        return `Cannot install module '${moduleKey}': invalid state transition from '${currentState}'`;

      case "enable":
        if (currentState === "uninstalled") {
          return `Cannot enable module '${moduleKey}': module must be installed before it can be enabled (current state: 'uninstalled')`;
        }
        if (currentState === "enabled") {
          return `Cannot enable module '${moduleKey}': module is already enabled`;
        }
        return `Cannot enable module '${moduleKey}': invalid state transition from '${currentState}'`;

      case "disable":
        if (currentState === "disabled") {
          return `Cannot disable module '${moduleKey}': module is already disabled`;
        }
        if (currentState === "uninstalled") {
          return `Cannot disable module '${moduleKey}': module is not installed or enabled (current state: 'uninstalled')`;
        }
        if (currentState === "installed") {
          return `Cannot disable module '${moduleKey}': module is not enabled (current state: 'installed')`;
        }
        return `Cannot disable module '${moduleKey}': invalid state transition from '${currentState}'`;

      case "uninstall":
        if (currentState === "uninstalled") {
          return `Cannot uninstall module '${moduleKey}': module is already uninstalled`;
        }
        return `Cannot uninstall module '${moduleKey}': invalid state transition from '${currentState}'`;

      default:
        return `Cannot perform transition '${transition}' on module '${moduleKey}' in state '${currentState}'`;
    }
  }
}
