#!/usr/bin/env node
/**
 * @file cli.ts
 * @description Příkazová řádka pro Architecture Boundary Gate.
 * Spouštěno přes `pnpm test:boundaries` nebo v CI.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { scanWorkspace } from "./scanner.js";

function findWorkspaceRoot(): string {
  // 1. Primárně hledat směrem nahoru od umístění skriptu v balíčku
  let dir = import.meta.dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  // 2. Fallback: hledat směrem nahoru od process.cwd()
  let curr = process.cwd();
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }

  return process.cwd();
}

function run() {
  const workspaceRoot = findWorkspaceRoot();
  const result = scanWorkspace(workspaceRoot);
  console.log(result.formattedReport);

  if (!result.success) {
    process.exit(1);
  }
}

run();
