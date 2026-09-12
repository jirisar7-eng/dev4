/**
 * @file rules.ts
 * @description Implementace autoritativních architektonických pravidel DEV4.
 * Autoritativní reference: docs/architecture/TMPR-NEWDEV-WORKSPACE-BOUNDARIES-1.0.md (Sekce 6)
 *
 * Pravidla:
 * - ERR-ARCH-001: Synthesis OS nesmí importovat CMS, Project, Domain Modules ani Apps.
 * - ERR-ARCH-002: Synthesis CMS nesmí importovat Project, Domain Modules ani Apps.
 * - ERR-ARCH-003: Module Engine nesmí importovat Domain Modules ani Project.
 * - ERR-ARCH-004: Synthesis OS, CMS a Admin nesmí importovat projektový brand.
 * - ERR-ARCH-005: Doménový modul nesmí importovat internals jiného modulu (pouze public contract).
 * - ERR-ARCH-007: Klientské aplikace nesmí přímo importovat databázovou vrstvu ani Prisma.
 * - ERR-ARCH-008: Zákaz balíčků bullmq a ioredis/redis.
 */

import type { BoundaryRule, RuleViolation } from "./types.js";

/**
 * ERR-ARCH-001 / ERR-ARCH-003: Synthesis OS nesmí importovat CMS, Project, Domain ani Apps.
 */
export const ruleSynthesisOsInversion: BoundaryRule = {
  id: "ERR-ARCH-001",
  name: "Synthesis OS Layer Inversion",
  description:
    "Synthesis OS je nezávislé jádro platformy. Nesmí importovat CMS, Project Package, doménové moduly ani aplikace.",
  check(source, target, importInfo): RuleViolation | null {
    if (source.layer !== "synthesis-os") {
      return null;
    }

    const forbiddenLayers = [
      "synthesis-cms",
      "project",
      "domain-module",
      "client-app",
      "backend-app",
    ];

    if (target.targetLayer && forbiddenLayers.includes(target.targetLayer)) {
      const isEngine = source.unit === "packages/module-engine";
      const ruleId = isEngine ? "ERR-ARCH-003" : "ERR-ARCH-001";
      const layerNames: Record<string, string> = {
        "synthesis-cms": "Synthesis CMS",
        project: "Project Package",
        "domain-module": "Domain Module",
        "client-app": "Client App",
        "backend-app": "Backend App",
      };

      const targetLayerName =
        layerNames[target.targetLayer] || target.targetLayer;

      return {
        ruleId,
        ruleName: isEngine
          ? "Module Engine Layer Inversion"
          : "Synthesis OS Layer Inversion",
        message: `Porušení hierarchie vrstev: '${source.unit}' (${source.layer}) nesmí importovat '${target.targetUnit || target.specifier}' (${targetLayerName}). Směr závislostí je Project/Domain -> CMS -> Synthesis OS.`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          "Odstraňte závislost na vyšší vrstvě nebo převeďte potřebný kód do společné vrstvy Synthesis OS či kontraktu.",
      };
    }

    return null;
  },
};

/**
 * ERR-ARCH-002: Synthesis CMS nesmí importovat Project, Domain ani Apps.
 */
export const ruleSynthesisCmsInversion: BoundaryRule = {
  id: "ERR-ARCH-002",
  name: "Synthesis CMS Layer Inversion",
  description:
    "Synthesis CMS je obecný redakční systém nezávislý na konkrétních doménách a projektech.",
  check(source, target, importInfo): RuleViolation | null {
    if (source.layer !== "synthesis-cms") {
      return null;
    }

    const forbiddenLayers = [
      "project",
      "domain-module",
      "client-app",
      "backend-app",
    ];

    if (target.targetLayer && forbiddenLayers.includes(target.targetLayer)) {
      const layerNames: Record<string, string> = {
        project: "Project Package",
        "domain-module": "Domain Module",
        "client-app": "Client App",
        "backend-app": "Backend App",
      };

      const targetLayerName =
        layerNames[target.targetLayer] || target.targetLayer;

      return {
        ruleId: "ERR-ARCH-002",
        ruleName: "Synthesis CMS Layer Inversion",
        message: `Porušení hierarchie vrstev: Synthesis CMS nesmí importovat '${target.targetUnit || target.specifier}' (${targetLayerName}). CMS je obecný systém a nesmí znát konkrétní projekt ani doménu.`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          "CMS smí být rozšiřováno pomocí pluginů a registrů, nikoliv přímým importem konkrétních doménových modulů či projektových balíčků.",
      };
    }

    return null;
  },
};

/**
 * ERR-ARCH-004: Brand Leakage - Synthesis OS, CMS a Admin nesmí importovat projektový brand.
 */
export const ruleBrandLeakage: BoundaryRule = {
  id: "ERR-ARCH-004",
  name: "Brand Leakage Prevention",
  description:
    "Synthesis OS, CMS a Administrace musí zůstat brandově neutrální a nesmějí importovat projektový brand.",
  check(source, target, importInfo): RuleViolation | null {
    const isNeutralSource =
      source.layer === "synthesis-os" ||
      source.layer === "synthesis-cms" ||
      source.unit === "apps/admin";

    if (!isNeutralSource) {
      return null;
    }

    if (target.isBrandAsset) {
      return {
        ruleId: "ERR-ARCH-004",
        ruleName: "Brand Leakage Prevention",
        message: `Únik brandu: Neutrální komponenta/vrstva '${source.unit}' nesmí importovat projektový brand '${target.specifier}'. Brand smí importovat pouze klientské aplikace konkrétního projektu (např. apps/public, apps/case) nebo Project Package.`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          "Nahraďte projektový brand neutrálními komponentami z packages/ui nebo předejte brand dynamicky konfigurací.",
      };
    }

    return null;
  },
};

/**
 * ERR-ARCH-005: Module Encapsulation - Modul A nesmí importovat internals modulu B.
 */
export const ruleModuleEncapsulation: BoundaryRule = {
  id: "ERR-ARCH-005",
  name: "Module Encapsulation",
  description:
    "Doménové moduly nesmějí importovat interní soubory jiných modulů. Komunikace je povolena výhradně přes veřejný kontrakt (@tmpr/<modul>/contract).",
  check(source, target, importInfo): RuleViolation | null {
    if (source.layer !== "domain-module") {
      return null;
    }

    if (target.targetLayer !== "domain-module") {
      return null;
    }

    // Pokud je cíl stejný modul jako zdroj, interní importy uvnitř modulu jsou v pořádku
    if (source.unit === target.targetUnit) {
      return null;
    }

    // Cíl je JINÝ doménový modul!
    // Ověřit, zda je to veřejný kontrakt
    const subpath = target.targetSubpath || "";
    const isContract =
      subpath === "contract" ||
      subpath === "contract.js" ||
      subpath === "contract.ts" ||
      subpath === "contract.d.ts" ||
      subpath === "src/contract" ||
      subpath === "src/contract.ts" ||
      subpath === "src/contract.js" ||
      target.specifier.endsWith("/contract");

    if (!isContract) {
      return {
        ruleId: "ERR-ARCH-005",
        ruleName: "Module Encapsulation",
        message: `Porušení zapouzdření modulu: Modul '${source.unitName}' nesmí importovat interní implementaci modulu '${target.targetUnitName || target.specifier}' ('${target.specifier}'). Mezimoduální komunikace je povolena výhradně přes veřejný kontrakt (@tmpr/${target.targetUnitName || "modul"}/contract).`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          `Importujte pouze veřejný kontrakt: import { ... } from '@tmpr/${target.targetUnitName}/contract'`,
      };
    }

    return null;
  },
};

/**
 * ERR-ARCH-007: Client Apps Direct DB - Klientské aplikace nesmí přímo importovat DB ani Prisma.
 */
export const ruleClientAppDirectDb: BoundaryRule = {
  id: "ERR-ARCH-007",
  name: "Client App Direct DB Prohibition",
  description:
    "Klientské aplikace (apps/public, apps/case, apps/admin, apps/team) nesmí přímo importovat databázovou vrstvu ani Prisma.",
  check(source, target, importInfo): RuleViolation | null {
    if (source.layer !== "client-app") {
      return null;
    }

    if (target.isDatabasePackage) {
      return {
        ruleId: "ERR-ARCH-007",
        ruleName: "Client App Direct DB Prohibition",
        message: `Neautorizovaný přístup k DB: Klientská aplikace '${source.unit}' nesmí přímo importovat databázovou vrstvu ani Prisma ('${target.specifier}'). Klientské aplikace musí komunikovat výhradně přes serverové API (apps/api).`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          "Vytvořte API endpoint v apps/api a z klientské aplikace volejte data přes síťové rozhraní.",
      };
    }

    return null;
  },
};

/**
 * ERR-ARCH-008: Forbidden Dependencies - Zákaz BullMQ a Redis v základní architektuře.
 */
export const ruleForbiddenDependencies: BoundaryRule = {
  id: "ERR-ARCH-008",
  name: "Forbidden Dependencies (Redis/BullMQ)",
  description:
    "Základní architektura DEV4 využívá PostgreSQL-backed frontu. Balíčky bullmq a ioredis/redis jsou zakázány.",
  check(source, target, importInfo): RuleViolation | null {
    const forbidden = ["bullmq", "ioredis", "redis"];
    const pkg = target.packageName?.toLowerCase() || target.specifier.toLowerCase();

    if (forbidden.includes(pkg) || forbidden.some((f) => pkg.startsWith(`${f}/`))) {
      return {
        ruleId: "ERR-ARCH-008",
        ruleName: "Forbidden Dependencies (Redis/BullMQ)",
        message: `Zakázaná závislost: Balíček '${target.specifier}' je v architektuře DEV4 zakázán. DEV4 používá PostgreSQL-backed job queue, ne Redis/BullMQ.`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          "Nahraďte externí Redis/BullMQ frontu databázovým mechanismem přes PostgreSQL / packages/db.",
      };
    }

    return null;
  },
};

/**
 * Kompletní sada výchozích architektonických pravidel.
 */

/**
 * ERR-ARCH-009: Module Engine Internal Mutation Import - Zamezuje obcházení mutability boundary modulu module-engine zvenčí.
 */
export const ruleModuleEngineInternalMutation: BoundaryRule = {
  id: "ERR-ARCH-009",
  name: "Module Engine Internal Mutation Import",
  description:
    "Zabraňuje všem komponentám mimo packages/module-engine importovat interní registry modulů.",
  check(source, target, importInfo): RuleViolation | null {
    if (source.unit === "packages/module-engine") {
      return null;
    }

    const isInternalTarget = 
      target.specifier.includes("module-engine/registry/registry.internal") ||
      target.specifier.includes("module-engine/src/registry/registry.internal");

    if (isInternalTarget) {
      return {
        ruleId: "ERR-ARCH-009",
        ruleName: "Module Engine Internal Mutation Import",
        message: `Závažné porušení zapouzdření: '${source.unit}' nesmí importovat mutační registry '${target.specifier}'.`,
        source,
        target,
        importType: importInfo.type,
        suggestion:
          "Závislost na vnitřní paměti engine modulu je nebezpečná a nesmí být použita mimo packages/module-engine.",
      };
    }
    return null;
  },
};

export const DEFAULT_BOUNDARY_RULES: BoundaryRule[] = [
  ruleSynthesisOsInversion,
  ruleSynthesisCmsInversion,
  ruleBrandLeakage,
  ruleModuleEncapsulation,
  ruleClientAppDirectDb,
  ruleForbiddenDependencies,
  ruleModuleEngineInternalMutation,
];
