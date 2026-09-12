/**
 * @file scanner.ts
 * @description Workspace skener a validátor architektonických hranic.
 * Prochází packages/*, modules/* a apps/*, analyzuje AST každého souboru a validuje pravidla.
 */

import fs from "node:fs";
import path from "node:path";
import { extractImportsFromSource } from "./ast-parser.js";
import {
  createSourceLocation,
  classifyImportTarget,
  normalizeWorkspacePath,
} from "./classifier.js";
import { DEFAULT_BOUNDARY_RULES } from "./rules.js";
import type {
  BoundaryGateResult,
  BoundaryRule,
  RuleViolation,
} from "./types.js";

export interface ScanOptions {
  rules?: BoundaryRule[];
  excludeFixtures?: boolean;
  targetDirs?: string[];
}

/**
 * Validuje přímo zdrojový kód zadaný jako řetězec (vhodné pro jednotkové testy).
 */
export function validateSourceCode(
  sourceCode: string,
  filePath: string,
  workspaceRoot?: string,
  rules: BoundaryRule[] = DEFAULT_BOUNDARY_RULES
): { violations: RuleViolation[]; importsCount: number } {
  const extractedImports = extractImportsFromSource(sourceCode, filePath);
  const violations: RuleViolation[] = [];

  for (const imp of extractedImports) {
    const sourceLoc = createSourceLocation(filePath, imp.line, workspaceRoot);
    const target = classifyImportTarget(sourceLoc, imp, workspaceRoot);

    for (const rule of rules) {
      const violation = rule.check(sourceLoc, target, imp);
      if (violation) {
        violations.push(violation);
      }
    }
  }

  return {
    violations,
    importsCount: extractedImports.length,
  };
}

/**
 * Rekurzivně vyhledá relevantní zdrojové soubory.
 */
function findSourceFiles(
  dirPath: string,
  workspaceRoot: string,
  excludeFixtures: boolean = true
): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return results;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = normalizeWorkspacePath(fullPath, workspaceRoot);

    // Ignorovat standardní artefakty a generované složky
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "dist-test" ||
      entry.name === ".turbo" ||
      entry.name === ".git"
    ) {
      continue;
    }

    if (excludeFixtures && (entry.name === "fixtures" || relPath.includes("/fixtures/"))) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...findSourceFiles(fullPath, workspaceRoot, excludeFixtures));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
        // Ignorovat d.ts soubory
        if (!entry.name.endsWith(".d.ts")) {
          results.push(fullPath);
        }
      }
    }
  }

  return results;
}

/**
 * Naformátuje nalezená porušení do přehledného českého reportu.
 */
export function formatViolationsReport(
  violations: RuleViolation[],
  scannedFilesCount: number,
  scannedImportsCount: number
): string {
  if (violations.length === 0) {
    return [
      "============================================================",
      "✅ ARCHITECTURE BOUNDARY GATE: VŠECHNY HRANICE DODRŽENY",
      "============================================================",
      `Zkontrolováno souborů: ${scannedFilesCount}`,
      `Zkontrolováno importů: ${scannedImportsCount}`,
      `Počet porušení: 0`,
      "Všechny vrstvy (Synthesis OS -> CMS -> Project -> Domain Modules) vyhovují specifikaci.",
      "============================================================",
    ].join("\n");
  }

  const lines: string[] = [
    "============================================================",
    `❌ ARCHITECTURE BOUNDARY GATE: DETEKOVÁNA PORUŠENÍ (${violations.length})`,
    "============================================================",
    `Zkontrolováno souborů: ${scannedFilesCount}`,
    `Zkontrolováno importů: ${scannedImportsCount}`,
    "",
  ];

  violations.forEach((v, index) => {
    lines.push(`[Chyba ${index + 1}/${violations.length}] ${v.ruleId}: ${v.ruleName}`);
    lines.push(`  Zdroj:      ${v.source.filePath}:${v.source.line} (vrstva: ${v.source.layer}, unit: ${v.source.unit})`);
    lines.push(`  Cíl:        ${v.target.specifier} (vrstva: ${v.target.targetLayer || "externí/neznámá"})`);
    if (v.target.resolvedPath) {
      lines.push(`  Resolved:   ${v.target.resolvedPath}`);
    }
    lines.push(`  Typ:        ${v.importType}`);
    lines.push(`  Zpráva:     ${v.message}`);
    if (v.suggestion) {
      lines.push(`  Doporučení: ${v.suggestion}`);
    }
    lines.push("");
  });

  lines.push("============================================================");
  return lines.join("\n");
}

/**
 * Provede kompletní sken workspace.
 */
export function scanWorkspace(
  workspaceRoot: string,
  options: ScanOptions = {}
): BoundaryGateResult {
  const rules = options.rules || DEFAULT_BOUNDARY_RULES;
  const excludeFixtures = options.excludeFixtures !== false;

  const targetDirs = options.targetDirs || [
    path.join(workspaceRoot, "packages"),
    path.join(workspaceRoot, "modules"),
    path.join(workspaceRoot, "apps"),
  ];

  const allFiles: string[] = [];
  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      allFiles.push(...findSourceFiles(dir, workspaceRoot, excludeFixtures));
    }
  }

  const allViolations: RuleViolation[] = [];
  let totalImportsCount = 0;

  for (const filePath of allFiles) {
    const code = fs.readFileSync(filePath, "utf8");
    const { violations, importsCount } = validateSourceCode(
      code,
      filePath,
      workspaceRoot,
      rules
    );

    totalImportsCount += importsCount;
    allViolations.push(...violations);
  }

  const formattedReport = formatViolationsReport(
    allViolations,
    allFiles.length,
    totalImportsCount
  );

  return {
    success: allViolations.length === 0,
    scannedFilesCount: allFiles.length,
    scannedImportsCount: totalImportsCount,
    violations: allViolations,
    formattedReport,
  };
}
