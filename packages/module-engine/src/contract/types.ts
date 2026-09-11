/**
 * @tmpr/module-engine - Module Contract Types
 * Autoritativní definice rozhraní a kontraktů modulárního systému Synthesis OS.
 */

import type { z } from "zod";
import type { ModuleManifestSchema } from "./manifest.schema.js";

/**
 * Typ manifestu modulu inferovaný z validovaného Zod schématu.
 */
export type IModuleManifest = z.infer<typeof ModuleManifestSchema>;

/**
 * Stav životního cyklu modulu.
 */
export type ModuleLifecycleState =
  | "uninstalled"
  | "installed"
  | "disabled"
  | "enabled"
  | "failed";

/**
 * Kontext předávaný do lifecycle hooků modulu.
 */
export interface IModuleLifecycleContext {
  readonly moduleKey: string;
  readonly version: string;
  readonly environment: "development" | "production" | "test";
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
  };
}

/**
 * Výsledek kontroly zdraví modulu (Health Check).
 */
export interface IModuleHealthResult {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly details?: Record<string, unknown>;
  readonly checkedAt: string; // ISO 8601
}

/**
 * Povinné běhové rozhraní každého doménového modulu.
 */
export interface IModule {
  /**
   * Statický neměnný manifest modulu.
   */
  readonly manifest: IModuleManifest;

  /**
   * Volitelný hook spouštěný při prvotní instalaci modulu.
   */
  onInstall?(context: IModuleLifecycleContext): Promise<void>;

  /**
   * Volitelný hook spouštěný při aktivaci (enable) modulu.
   */
  onEnable?(context: IModuleLifecycleContext): Promise<void>;

  /**
   * Volitelný hook spouštěný při deaktivaci (disable) modulu.
   */
  onDisable?(context: IModuleLifecycleContext): Promise<void>;

  /**
   * Volitelný hook spouštěný při odinstalaci (uninstall) modulu.
   */
  onUninstall?(context: IModuleLifecycleContext): Promise<void>;

  /**
   * Volitelný hook pro runtime health check modulu.
   */
  onHealthCheck?(context: IModuleLifecycleContext): Promise<IModuleHealthResult>;
}
