/**
 * @file classifier.ts
 * @description Klasifikátor vrstev, modulů a importních cílů v DEV4 monorepu.
 * Striktně respektuje hierarchii:
 * Synthesis OS -> Synthesis CMS -> Project Package -> Domain Modules
 * Žádný projektový hardcoding v samotném klasifikátoru.
 */

import path from "node:path";
import type {
  LayerId,
  SourceLocation,
  TargetClassification,
  ExtractedImport,
} from "./types.js";

/**
 * Normalizuje relativní nebo absolutní cestu vůči kořeni workspace.
 */
export function normalizeWorkspacePath(
  filePath: string,
  workspaceRoot?: string
): string {
  let normalized = filePath.replace(/\\/g, "/");
  if (workspaceRoot) {
    const normRoot = workspaceRoot.replace(/\\/g, "/");
    if (normalized.startsWith(normRoot)) {
      normalized = normalized.slice(normRoot.length);
    }
  }
  // Odstranit úvodní lomítka
  normalized = normalized.replace(/^\/+/, "");
  return normalized;
}

/**
 * Určí LayerId, unit a unitName z cesty k souboru.
 */
export function classifyWorkspacePath(workspaceRelativePath: string): {
  layer: LayerId;
  unit: string;
  unitName: string;
} {
  const p = normalizeWorkspacePath(workspaceRelativePath);

  // 1. Packages
  if (p.startsWith("packages/")) {
    const parts = p.split("/");
    const packageName = parts[1] || "";
    const unit = `packages/${packageName}`;

    // Synthesis OS vrstva (Platform Core & Platform Services & Tools)
    if (
      packageName === "synthesis-core" ||
      packageName === "module-engine" ||
      packageName === "ui" ||
      packageName === "boundary-gate" ||
      (packageName.startsWith("synthesis-") && packageName !== "synthesis-cms")
    ) {
      return { layer: "synthesis-os", unit, unitName: packageName };
    }

    // Synthesis CMS vrstva
    if (packageName === "synthesis-cms") {
      return { layer: "synthesis-cms", unit, unitName: packageName };
    }

    // Project Package vrstva (např. packages/project-tata-ma-pravo)
    if (packageName.startsWith("project-")) {
      return { layer: "project", unit, unitName: packageName };
    }

    // Sdílená infrastruktura (contracts, db)
    if (packageName === "contracts" || packageName === "db") {
      return { layer: "shared-infra", unit, unitName: packageName };
    }

    return { layer: "unknown", unit, unitName: packageName };
  }

  // 2. Domain Modules (modules/*)
  if (p.startsWith("modules/")) {
    const parts = p.split("/");
    const moduleName = parts[1] || "";
    const unit = `modules/${moduleName}`;
    return { layer: "domain-module", unit, unitName: moduleName };
  }

  // 3. Apps (apps/*)
  if (p.startsWith("apps/")) {
    const parts = p.split("/");
    const appName = parts[1] || "";
    const unit = `apps/${appName}`;

    if (appName === "api" || appName === "worker") {
      return { layer: "backend-app", unit, unitName: appName };
    }
    return { layer: "client-app", unit, unitName: appName };
  }

  return { layer: "unknown", unit: "root", unitName: "root" };
}

/**
 * Vytvoří SourceLocation pro daný soubor a řádek.
 */
export function createSourceLocation(
  filePath: string,
  line: number,
  workspaceRoot?: string
): SourceLocation {
  const relPath = normalizeWorkspacePath(filePath, workspaceRoot);
  const { layer, unit, unitName } = classifyWorkspacePath(relPath);

  return {
    filePath: relPath,
    line,
    layer,
    unit,
    unitName,
  };
}

/**
 * Klasifikuje cíl importu (target).
 */
export function classifyImportTarget(
  source: SourceLocation,
  importInfo: ExtractedImport,
  workspaceRoot?: string
): TargetClassification {
  const { specifier } = importInfo;

  // Kontrola přímého importu DB / Prisma
  const isDatabasePkg =
    specifier === "@prisma/client" ||
    specifier.startsWith("@prisma/client/") ||
    specifier === "@tmpr/db" ||
    specifier.startsWith("@tmpr/db/") ||
    specifier === "packages/db" ||
    specifier.startsWith("packages/db/");

  // Případ A: Relativní import (začíná . nebo ..)
  if (specifier.startsWith(".")) {
    const sourceDir = path.dirname(source.filePath);
    const resolvedRaw = path.join(sourceDir, specifier);
    const resolvedRelative = normalizeWorkspacePath(resolvedRaw, workspaceRoot);

    const { layer: targetLayer, unit: targetUnit, unitName: targetUnitName } =
      classifyWorkspacePath(resolvedRelative);

    // Subpath uvnitř target unit
    let targetSubpath: string | undefined;
    if (resolvedRelative.startsWith(targetUnit + "/")) {
      targetSubpath = resolvedRelative.slice(targetUnit.length + 1);
    }

    const isBrandAsset =
      resolvedRelative.includes("/brand") || resolvedRelative.endsWith("/brand");

    const isDbDirect =
      targetUnit === "packages/db" ||
      resolvedRelative.includes("/prisma/") ||
      resolvedRelative.includes("@prisma/client");

    return {
      specifier,
      isRelative: true,
      resolvedPath: resolvedRelative,
      targetLayer,
      targetUnit,
      targetUnitName,
      targetSubpath,
      isExternal: false,
      isBrandAsset,
      isDatabasePackage: isDbDirect || isDatabasePkg,
    };
  }

  // Případ B: Workspace package (@tmpr/...)
  if (specifier.startsWith("@tmpr/")) {
    const rawSub = specifier.slice("@tmpr/".length);
    const parts = rawSub.split("/");
    const targetName = parts[0] || "";
    const subpath = parts.slice(1).join("/");

    // Je to project package?
    if (targetName.startsWith("project-")) {
      const isBrandAsset =
        subpath === "brand" ||
        subpath.startsWith("brand/") ||
        rawSub.includes("/brand");

      return {
        specifier,
        isRelative: false,
        targetLayer: "project",
        targetUnit: `packages/${targetName}`,
        targetUnitName: targetName,
        targetSubpath: subpath || undefined,
        isExternal: false,
        isBrandAsset,
        isDatabasePackage: false,
      };
    }

    // Je to CMS?
    if (targetName === "synthesis-cms") {
      return {
        specifier,
        isRelative: false,
        targetLayer: "synthesis-cms",
        targetUnit: "packages/synthesis-cms",
        targetUnitName: targetName,
        targetSubpath: subpath || undefined,
        isExternal: false,
        isBrandAsset: false,
        isDatabasePackage: false,
      };
    }

    // Je to Synthesis OS (synthesis-core, module-engine, ui, boundary-gate)?
    if (
      targetName === "synthesis-core" ||
      targetName === "module-engine" ||
      targetName === "ui" ||
      targetName === "boundary-gate" ||
      (targetName.startsWith("synthesis-") && targetName !== "synthesis-cms")
    ) {
      return {
        specifier,
        isRelative: false,
        targetLayer: "synthesis-os",
        targetUnit: `packages/${targetName}`,
        targetUnitName: targetName,
        targetSubpath: subpath || undefined,
        isExternal: false,
        isBrandAsset: false,
        isDatabasePackage: false,
      };
    }

    // Sdílená infra
    if (targetName === "contracts" || targetName === "db") {
      return {
        specifier,
        isRelative: false,
        targetLayer: "shared-infra",
        targetUnit: `packages/${targetName}`,
        targetUnitName: targetName,
        targetSubpath: subpath || undefined,
        isExternal: false,
        isBrandAsset: false,
        isDatabasePackage: targetName === "db",
      };
    }

    // Ostatní @tmpr/<name> jsou doménové moduly (modules/*)
    return {
      specifier,
      isRelative: false,
      targetLayer: "domain-module",
      targetUnit: `modules/${targetName}`,
      targetUnitName: targetName,
      targetSubpath: subpath || undefined,
      isExternal: false,
      isBrandAsset: false,
      isDatabasePackage: false,
    };
  }

  // Případ C: Přímé cesty packages/*, modules/*, apps/*
  if (
    specifier.startsWith("packages/") ||
    specifier.startsWith("modules/") ||
    specifier.startsWith("apps/")
  ) {
    const { layer: targetLayer, unit: targetUnit, unitName: targetUnitName } =
      classifyWorkspacePath(specifier);

    let targetSubpath: string | undefined;
    if (specifier.startsWith(targetUnit + "/")) {
      targetSubpath = specifier.slice(targetUnit.length + 1);
    }

    const isBrandAsset =
      specifier.includes("/brand") || specifier.endsWith("/brand");

    return {
      specifier,
      isRelative: false,
      resolvedPath: specifier,
      targetLayer,
      targetUnit,
      targetUnitName,
      targetSubpath,
      isExternal: false,
      isBrandAsset,
      isDatabasePackage: targetUnit === "packages/db" || isDatabasePkg,
    };
  }

  // Případ D: Externí balíček (npm závislost)
  return {
    specifier,
    isRelative: false,
    isExternal: true,
    packageName: specifier.split("/")[0],
    isBrandAsset: false,
    isDatabasePackage: isDatabasePkg,
  };
}
