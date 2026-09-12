#!/usr/bin/env node
/**
 * @file cli.ts
 * @description CLI generátor standardního doménového modulu Synthesis OS.
 *
 * Použití:
 *   pnpm scaffold:module --moduleKey family.alimony
 *   node packages/module-engine/dist/scaffold/cli.js --moduleKey custom.sample --overwrite
 */

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import type { ScaffoldModuleOptions } from "./types.js";
import { scaffoldModule } from "./generator.js";

/**
 * Parsuje argumenty příkazové řádky do možností pro generátor.
 */
export function parseCliArgs(args: string[]): {
  options?: ScaffoldModuleOptions;
  showHelp?: boolean;
  jsonOutput?: boolean;
  error?: string;
} {
  const result: ScaffoldModuleOptions = {
    moduleKey: "",
  };
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== "string") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return { showHelp: true };
    }

    if (arg === "--json") {
      jsonOutput = true;
      continue;
    }

    if (arg === "--overwrite" || arg === "-f") {
      result.overwrite = true;
      continue;
    }

    if (arg === "--dryRun" || arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }

    // Argumenty s hodnotou (--key=val nebo --key val)
    if (arg.startsWith("--moduleKey=") || arg.startsWith("--module-key=")) {
      const parts = arg.split("=");
      result.moduleKey = parts.slice(1).join("=");
    } else if (arg === "--moduleKey" || arg === "--module-key" || arg === "-k") {
      i++;
      result.moduleKey = args[i] ?? "";
    } else if (arg.startsWith("--name=")) {
      const parts = arg.split("=");
      result.name = parts.slice(1).join("=");
    } else if (arg === "--name" || arg === "-n") {
      i++;
      result.name = args[i] ?? "";
    } else if (arg.startsWith("--description=")) {
      const parts = arg.split("=");
      result.description = parts.slice(1).join("=");
    } else if (arg === "--description" || arg === "-d") {
      i++;
      result.description = args[i] ?? "";
    } else if (arg.startsWith("--version=")) {
      const parts = arg.split("=");
      result.version = parts.slice(1).join("=");
    } else if (arg === "--version" || arg === "-v") {
      i++;
      result.version = args[i] ?? "";
    } else if (arg.startsWith("--targetDir=") || arg.startsWith("--target-dir=")) {
      const parts = arg.split("=");
      result.targetDir = parts.slice(1).join("=");
    } else if (arg === "--targetDir" || arg === "--target-dir" || arg === "-t") {
      i++;
      result.targetDir = args[i] ?? "";
    } else if (!arg.startsWith("-") && !result.moduleKey) {
      // Poziční argument pro moduleKey
      result.moduleKey = arg;
    } else {
      return { error: `Neznámý parametr: ${arg}` };
    }
  }

  if (!result.moduleKey) {
    return {
      error:
        "Chybí povinný parametr '--moduleKey <klíč>' (např. 'family.alimony' nebo 'custom.sample-module').",
    };
  }

  return { options: result, jsonOutput };
}

/**
 * Vypíše nápovědu k příkazu.
 */
export function printHelp(): void {
  console.log(`
Generátor standardního doménového modulu pro Synthesis OS
=========================================================

Příkaz vygeneruje deterministický a architektonicky izolovaný doménový modul
podle aktuálního kontraktu ModuleContract (obsahuje manifest, domain, data, api,
public, admin, help, tests a migrations).

POUŽITÍ:
  pnpm scaffold:module --moduleKey <namespaced-key> [volby]
  node dist/scaffold/cli.js -k <namespaced-key> [volby]

POVINNÉ PARAMETRY:
  -k, --moduleKey <key>      Klíč modulu v jmenném prostoru (např. 'family.alimony', 'sample.demo')

VOLITELNÉ PARAMETRY:
  -n, --name <name>          Lidsky čitelný název (např. 'Family Alimony')
  -d, --description <text>   Popis účelu modulu
  -v, --version <semver>     Počáteční verze modulu (výchozí: '0.1.0')
  -t, --targetDir <cesta>    Cílový adresář (výchozí: 'modules/<slug>')
  -f, --overwrite            Povolit přepsání existujícího neprázdného adresáře
      --dryRun               Režim náhledu bez fyzického zápisu souborů
      --json                 Strojově čitelný výstup ve formátu JSON
  -h, --help                 Zobrazit tuto nápovědu

PŘÍKLADY:
  pnpm scaffold:module -k family.alimony
  pnpm scaffold:module -k custom.my-module --name "My Custom Module"
  pnpm scaffold:module -k sample.test --dryRun
`);
}

/**
 * Hlavní běh CLI.
 */
export function runCli(args: string[] = process.argv.slice(2)): void {
  const parsed = parseCliArgs(args);

  if (parsed.showHelp) {
    printHelp();
    return;
  }

  if (parsed.error) {
    if (parsed.jsonOutput) {
      console.error(JSON.stringify({ success: false, error: parsed.error }, null, 2));
    } else {
      console.error(`\x1b[31mCHYBA:\x1b[0m ${parsed.error}\n`);
      console.error("Pro zobrazení nápovědy spusťte příkaz s přepínačem '--help'.");
    }
    process.exit(1);
  }

  if (!parsed.options) {
    process.exit(1);
  }

  try {
    const result = scaffoldModule(parsed.options);

    if (parsed.jsonOutput) {
      console.log(
        JSON.stringify(
          {
            success: true,
            moduleKey: result.moduleKey,
            targetDir: result.targetDir,
            dryRun: result.dryRun,
            files: result.files.map((f) => f.relativePath),
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`\n\x1b[32m✔ Modul '${result.moduleKey}' byl úspěšně ${result.dryRun ? "naplánován (dry-run)" : "vygenerován"}!\x1b[0m\n`);
    console.log(`  \x1b[1mCílový adresář:\x1b[0m ${result.targetDir}`);
    console.log(`  \x1b[1mPočet souborů:\x1b[0m  ${result.files.length}`);
    console.log(`\n  \x1b[1mStruktura modulu:\x1b[0m`);

    for (const file of result.files) {
      console.log(`    \x1b[36m•\x1b[0m ${file.relativePath}`);
    }

    console.log(`\n\x1b[33mDalší kroky:\x1b[0m`);
    console.log(`  1. Ověření hranic:   pnpm test:boundaries`);
    console.log(`  2. Spuštění testů:   pnpm --filter ${path.basename(result.targetDir)} test`);
    console.log();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (parsed.jsonOutput) {
      console.error(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      console.error(`\n\x1b[31mCHYBA PŘI GENEROVÁNÍ MODULU:\x1b[0m ${message}\n`);
    }
    process.exit(1);
  }
}

// Spustit přímo při vyvolání jako skript
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  runCli();
}
