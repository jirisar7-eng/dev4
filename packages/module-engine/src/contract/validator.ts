/**
 * @tmpr/module-engine - Module Manifest Validator
 * Funkce pro striktní strojovou validaci manifestu modulu s českou diagnostikou.
 */

import { z } from "zod";
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
 * Překládá interní názvy datových typů do češtiny.
 */
function translateZodType(t: unknown): string {
  switch (t) {
    case "string":
      return "string (řetězec)";
    case "number":
      return "number (číslo)";
    case "boolean":
      return "boolean (logická hodnota)";
    case "array":
      return "array (pole)";
    case "object":
      return "object (objekt)";
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    default:
      return String(t);
  }
}

/**
 * Detekuje, zda daný řetězec již obsahuje českou diagnostickou zprávu.
 */
function isCzechDiagnostic(text: string): boolean {
  return (
    /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(text) ||
    /\b(musí|nemůže|povinn|neplatn|zadán|cesta|řetězec|klíč|rozsah|zadána|chybí|očekáván)\b/i.test(text)
  );
}

/**
 * Lokální formatter validačních chyb Zod do deterministické technické češtiny.
 * Zajišťuje, že se nevrací žádné výchozí anglické fráze Zodu.
 */
export function formatManifestValidationIssueCs(issue: z.ZodIssue): string {
  // Pokud issue.message již obsahuje českou zprávu (např. z manifest.schema.ts), použijeme ji
  if (issue.message && isCzechDiagnostic(issue.message)) {
    return issue.message;
  }

  const code = String(issue.code);
  const pathStr = issue.path.join(".");

  switch (code) {
    case "unrecognized_keys": {
      const keys = (issue as any).keys as string[] | undefined;
      const keysStr = keys ? keys.join(", ") : "";
      if (pathStr.endsWith("ui") || pathStr === "surfaces.ui") {
        return (
          "Zadána neznámá UI surface: " +
          keysStr +
          "; povolené surfaces jsou public, account, admin"
        );
      }
      if (pathStr.endsWith("surfaces") || pathStr === "surfaces") {
        return (
          "Zadána neznámá kategorie surface: " +
          keysStr +
          "; povoleny jsou pouze api a ui"
        );
      }
      return (
        "Nerozpoznané klíče: " +
        (keys ? keys.map((k) => "'" + k + "'").join(", ") : "")
      );
    }

    case "invalid_type": {
      const inv = issue as any;
      if (
        inv.received === "undefined" ||
        (inv.message && inv.message.includes("received undefined"))
      ) {
        return (
          "Chybějící povinné pole (očekáván typ " +
          translateZodType(inv.expected) +
          ")"
        );
      }
      return (
        "Neplatný typ: očekáván " +
        translateZodType(inv.expected) +
        ", ale obdržen " +
        translateZodType(inv.received)
      );
    }

    case "invalid_value":
    case "invalid_enum_value":
    case "invalid_literal": {
      const inv = issue as any;
      const values = inv.values || inv.options;
      if (Array.isArray(values)) {
        if (values.length === 1) {
          return "Neplatná literální hodnota: očekáváno '" + values[0] + "'";
        }
        return (
          "Neplatná hodnota enumu. Očekáváno jedno z: " +
          values.map((o) => "'" + o + "'").join(", ") +
          ", ale obdrženo '" +
          inv.received +
          "'"
        );
      }
      if (inv.expected !== undefined) {
        return "Neplatná hodnota: očekáváno '" + String(inv.expected) + "'";
      }
      return "Neplatná hodnota";
    }

    case "too_small": {
      const inv = issue as any;
      const type = inv.origin || inv.type;
      if (type === "string") {
        return inv.minimum === 1 && inv.inclusive
          ? "Hodnota nesmí být prázdná"
          : "Řetězec musí mít alespoň " + inv.minimum + " znaků";
      }
      if (type === "array") {
        return "Pole musí obsahovat alespoň " + inv.minimum + " prvků";
      }
      if (type === "number") {
        return inv.inclusive
          ? "Číslo musí být větší nebo rovno " + inv.minimum
          : "Číslo musí být větší než " + inv.minimum;
      }
      return "Hodnota je příliš malá";
    }

    case "too_big": {
      const inv = issue as any;
      const type = inv.origin || inv.type;
      if (type === "string") {
        return "Řetězec smí mít maximálně " + inv.maximum + " znaků";
      }
      if (type === "array") {
        return "Pole smí obsahovat maximálně " + inv.maximum + " prvků";
      }
      if (type === "number") {
        return inv.inclusive
          ? "Číslo musí být menší nebo rovno " + inv.maximum
          : "Číslo musí být menší než " + inv.maximum;
      }
      return "Hodnota je příliš velká";
    }

    case "invalid_format":
    case "invalid_string": {
      return "Neplatný formát řetězce";
    }

    case "invalid_union": {
      return "Hodnota neodpovídá žádné z povolených variant";
    }

    case "custom": {
      return issue.message;
    }

    default: {
      return issue.message || "Neplatná hodnota";
    }
  }
}

/**
 * Validuje surový objekt manifestu modulu.
 * Vyhodí výjimku Error s detailním českým popisem, pokud validace selže.
 */
export function validateModuleManifest(rawManifest: unknown): IModuleManifest {
  const parseResult = ModuleManifestSchema.safeParse(rawManifest);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map(
        (issue) =>
          "[" + (issue.path.join(".") || "root") + "]: " + formatManifestValidationIssueCs(issue)
      )
      .join("; ");
    throw new Error("Validace manifestu modulu selhala: " + errorDetails);
  }
  return parseResult.data;
}

/**
 * Bezpečná validace bez vyhození výjimky. Vrací objekt s výsledkem a českou diagnostikou.
 */
export function safeValidateModuleManifest(rawManifest: unknown): ValidationResult {
  const parseResult = ModuleManifestSchema.safeParse(rawManifest);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(
      (issue) =>
        "[" + (issue.path.join(".") || "root") + "]: " + formatManifestValidationIssueCs(issue)
    );
    return { success: false, errors };
  }
  return { success: true, data: parseResult.data };
}
