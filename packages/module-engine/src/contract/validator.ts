/**
 * @tmpr/module-engine - Module Manifest Validator
 * Funkce pro striktní strojovou validaci manifestu modulu.
 */

import { ModuleManifestSchema } from "./manifest.schema.js";
import type { IModuleManifest } from "./types.js";

export interface ValidationSuccess {
  readonly success: true;
  readonly data: IModuleManifest;
}

export interface ValidationFailure {
  readonly success: false;
  readonly errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validuje surový objekt manifestu modulu.
 * Vyhodí výjimku Error s detailním popisem, pokud validace selže.
 */
export function validateModuleManifest(rawManifest: unknown): IModuleManifest {
  const parseResult = ModuleManifestSchema.safeParse(rawManifest);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((issue) => "[" + (issue.path.join(".") || "root") + "]: " + issue.message)
      .join("; ");
    throw new Error("Module manifest validation failed: " + errorDetails);
  }
  return parseResult.data;
}

/**
 * Bezpečná validace bez vyhození výjimky. Vrací objekt s výsledkem.
 */
export function safeValidateModuleManifest(rawManifest: unknown): ValidationResult {
  const parseResult = ModuleManifestSchema.safeParse(rawManifest);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(
      (issue) => "[" + (issue.path.join(".") || "root") + "]: " + issue.message
    );
    return { success: false, errors };
  }
  return { success: true, data: parseResult.data };
}
