/**
 * @file ast-parser.ts
 * @description Robustní TypeScript AST analyzátor importů, re-exportů a dynamických importů.
 * Nevyužívá křehký regex, ale plný TypeScript AST parser.
 */

import ts from "typescript";
import type { ExtractedImport } from "./types.js";

export function extractImportsFromSource(
  sourceCode: string,
  fileName: string = "file.ts"
): ExtractedImport[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const results: ExtractedImport[] = [];

  function visit(node: ts.Node) {
    // 1. Statické importy: import { ... } from '...'; import * as x from '...'; import x from '...';
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const line =
          sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;

        results.push({
          specifier,
          type: "static-import",
          line,
          isTypeOnly,
        });
      }
    }
    // 2. Statické re-exporty: export { x } from '...'; export * from '...'; export * as ns from '...';
    else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const line =
          sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const isTypeOnly = node.isTypeOnly;

        results.push({
          specifier,
          type: "re-export",
          line,
          isTypeOnly,
        });
      }
    }
    // 3. Dynamické importy: import('...') a require('...')
    else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isStringLiteral(firstArg)) {
          const line =
            sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          results.push({
            specifier: firstArg.text,
            type: "dynamic-import",
            line,
            isTypeOnly: false,
          });
        }
      } else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isStringLiteral(firstArg)) {
          const line =
            sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          results.push({
            specifier: firstArg.text,
            type: "require",
            line,
            isTypeOnly: false,
          });
        }
      }
    }
    // 4. Import equals: import x = require('...')
    else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) {
        const expr = node.moduleReference.expression;
        if (expr && ts.isStringLiteral(expr)) {
          const line =
            sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          results.push({
            specifier: expr.text,
            type: "static-import",
            line,
            isTypeOnly: false,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}
