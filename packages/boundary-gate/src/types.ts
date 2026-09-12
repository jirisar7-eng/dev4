/**
 * @file types.ts
 * @description Typové definice pro architekturu a AST kontrolu architektonických hranic DEV4.
 * Autoritativní reference: docs/architecture/TMPR-NEWDEV-WORKSPACE-BOUNDARIES-1.0.md
 */

export type LayerId =
  | "synthesis-os"
  | "synthesis-cms"
  | "project"
  | "domain-module"
  | "shared-infra"
  | "client-app"
  | "backend-app"
  | "unknown";

export type ImportType =
  | "static-import"
  | "re-export"
  | "dynamic-import"
  | "require";

export interface ExtractedImport {
  specifier: string;
  type: ImportType;
  line: number;
  isTypeOnly: boolean;
}

export interface SourceLocation {
  filePath: string;
  line: number;
  layer: LayerId;
  unit: string;
  unitName: string;
}

export interface TargetClassification {
  specifier: string;
  isRelative: boolean;
  resolvedPath?: string;
  targetLayer?: LayerId;
  targetUnit?: string;
  targetUnitName?: string;
  targetSubpath?: string;
  isExternal: boolean;
  packageName?: string;
  isBrandAsset?: boolean;
  isDatabasePackage?: boolean;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  message: string;
  source: SourceLocation;
  target: TargetClassification;
  importType: ImportType;
  suggestion?: string;
}

export interface BoundaryGateResult {
  success: boolean;
  scannedFilesCount: number;
  scannedImportsCount: number;
  violations: RuleViolation[];
  formattedReport: string;
}

export interface BoundaryRule {
  id: string;
  name: string;
  description: string;
  check: (
    source: SourceLocation,
    target: TargetClassification,
    importInfo: ExtractedImport
  ) => RuleViolation | null;
}
