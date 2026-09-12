/**
 * @tmpr/module-engine - Module Gate Errors
 * Výjimka pro odmítnutý přístup na úrovni Module Gate (např. v assertModuleAccess).
 */

import type { ModuleGateDecision, ModuleGateDecisionCode } from "./gate.types.js";

export class ModuleGateError extends Error {
  public readonly code: ModuleGateDecisionCode;
  public readonly decision: ModuleGateDecision;

  constructor(decision: ModuleGateDecision, message?: string) {
    const detailMsg = message ?? `Module gate access denied: [${decision.code}] for module '${decision.moduleKey ?? "unknown"}'`;
    super(detailMsg);
    this.name = "ModuleGateError";
    this.code = decision.code;
    this.decision = decision;
  }
}
