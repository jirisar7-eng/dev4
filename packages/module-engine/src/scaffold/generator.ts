/**
 * @tmpr/module-engine - Scaffold Generator
 * Deterministický engine pro generování standardního doménového modulu.
 */

import fs from "node:fs";
import path from "node:path";
import { NAMESPACED_MODULE_KEY_REGEX, isValidSemver } from "../contract/manifest.schema.js";
import { validateModuleManifest } from "../contract/validator.js";
import type { IModuleManifest } from "../contract/types.js";
import type {
  ScaffoldModuleOptions,
  ResolvedScaffoldMetadata,
  ScaffoldResult,
} from "./types.js";
import { generateModuleFiles } from "./templates.js";

/**
 * Nalezne kořen monorepa (kde se nachází pnpm-workspace.yaml).
 */
export function findWorkspaceRoot(startDir?: string): string {
  // 1. Zkusit hledat od zadaného startDir
  if (startDir) {
    let curr = path.resolve(startDir);
    while (curr !== path.dirname(curr)) {
      if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
        return curr;
      }
      curr = path.dirname(curr);
    }
  }

  // 2. Hledat směrem nahoru od umístění balíčku (import.meta.dirname)
  let dir = import.meta.dirname;
  while (dir && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  // 3. Fallback: hledat od process.cwd()
  let curr = process.cwd();
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }

  return process.cwd();
}

/**
 * Převede klíč modulu na PascalCase (např. 'family.alimony' -> 'FamilyAlimony').
 */
export function toPascalCase(str: string): string {
  const parts = str.split(/[.\-_]/).filter((p) => p.length > 0);
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * Převede klíč modulu na camelCase (např. 'family.alimony' -> 'familyAlimony').
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  if (pascal.length === 0) return "";
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Převede klíč modulu na čitelný název (např. 'family.alimony' -> 'Family Alimony').
 */
export function toHumanName(str: string): string {
  const parts = str.split(/[.\-_]/).filter((p) => p.length > 0);
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Striktně validuje vstupní parametry generátoru.
 */
export function validateScaffoldOptions(options: ScaffoldModuleOptions): void {
  if (!options) {
    throw new Error("Parametry generátoru nesmějí být prázdné.");
  }

  const { moduleKey, version } = options;

  if (typeof moduleKey !== "string" || moduleKey.trim().length === 0) {
    throw new Error(
      "Klíč modulu (moduleKey) je povinný parametr a nesmí být prázdný."
    );
  }

  const trimmedKey = moduleKey.trim();
  if (!NAMESPACED_MODULE_KEY_REGEX.test(trimmedKey)) {
    throw new Error(
      `Neplatný klíč modulu '${trimmedKey}'. Klíč musí být v jmenném prostoru s tečkovou notací a malými písmeny (např. 'family.alimony', 'legal.statutes-sync').`
    );
  }

  if (version !== undefined) {
    if (!isValidSemver(version)) {
      throw new Error(
        `Neplatná verze '${version}'. Verze musí být platný SemVer řetězec bez prefixu 'v' (např. '0.1.0', '1.0.0').`
      );
    }
  }
}

/**
 * Normalizuje možnosti na kompletní sadu metadat pro šablony.
 */
export function normalizeScaffoldMetadata(
  options: ScaffoldModuleOptions
): ResolvedScaffoldMetadata {
  validateScaffoldOptions(options);

  const trimmedKey = options.moduleKey.trim();
  const slug = trimmedKey.replace(/\./g, "-");
  const dbPrefix = trimmedKey.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const pascalCase = toPascalCase(trimmedKey);
  const camelCase = toCamelCase(trimmedKey);
  const humanName = options.name?.trim() || toHumanName(trimmedKey);
  const description =
    options.description?.trim() ||
    `Standardní doménový modul pro '${trimmedKey}'.`;
  const version = options.version?.trim() || "0.1.0";
  const workspaceRoot = options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : findWorkspaceRoot();

  const targetDir = options.targetDir
    ? path.resolve(options.targetDir)
    : path.join(workspaceRoot, "modules", slug);

  return {
    moduleKey: trimmedKey,
    name: humanName,
    description,
    version,
    slug,
    packageName: `@tmpr/${slug}`,
    dbPrefix,
    pascalCase,
    camelCase,
    targetDir,
    workspaceRoot,
    overwrite: Boolean(options.overwrite),
    dryRun: Boolean(options.dryRun),
  };
}

/**
 * Vytvoří in-memory reprezentaci manifestu modulu pro přímou validaci schématem.
 */
export function buildManifestObject(meta: ResolvedScaffoldMetadata): IModuleManifest {
  return {
    moduleKey: meta.moduleKey,
    name: meta.name,
    description: meta.description,
    version: meta.version,
    compatibility: {
      synthesisCore: "^0.1.0",
    },
    dependencies: {
      required: [],
      optional: [],
      conflicts: [],
    },
    lifecycle: {
      supportedHooks: ["enable", "disable"],
      requiresRestart: false,
      disableBehavior: {
        mode: "fail_closed",
        dataRetention: "retain",
      },
    },
    surfaces: {
      api: {
        enabled: true,
        basePath: `/api/v1/${meta.slug}`,
        surfaces: ["synapi_private"],
      },
      ui: {
        public: {
          enabled: true,
          routePrefix: `/${meta.slug}`,
        },
        admin: {
          enabled: true,
          routePrefix: `/admin/${meta.slug}`,
        },
      },
    },
    routes: [
      {
        path: `/api/v1/${meta.slug}/status`,
        surface: "api",
        requiresAuth: false,
      },
      {
        path: `/${meta.slug}`,
        surface: "public",
        requiresAuth: false,
      },
      {
        path: `/admin/${meta.slug}`,
        surface: "admin",
        requiresAuth: true,
        permission: `${meta.slug}.admin`,
      },
    ],
    permissions: [
      {
        key: `${meta.slug}.view`,
        name: `${meta.name} View`,
        description: `Základní oprávnění k prohlížení pro modul ${meta.name}`,
        defaultRoles: ["user", "admin"],
      },
      {
        key: `${meta.slug}.admin`,
        name: `${meta.name} Administration`,
        description: `Administrátorské oprávnění pro modul ${meta.name}`,
        defaultRoles: ["admin"],
      },
    ],
    capabilities: [`${meta.slug}.core`],
    dataOwnership: {
      tables: [`${meta.dbPrefix}_records`],
      schemaPath: "database/schema/schema.prisma",
      migrationsPath: "database/migrations",
      isolatedData: true,
    },
    events: {
      emits: [`${meta.moduleKey}.created`, `${meta.moduleKey}.updated`],
      subscribes: [],
    },
    jobs: [
      {
        jobKey: `${meta.moduleKey}.cleanup`,
        description: `Pravidelná údržbová úloha modulu ${meta.name}`,
        schedule: "0 2 * * *",
        queueType: "postgres_queue",
        retryLimit: 3,
      },
    ],
    cms: {
      contentPacks: [],
      textKeys: [`${meta.moduleKey}.title`, `${meta.moduleKey}.description`],
      help: {
        cs: {
          enabled: true,
          path: "help/cs",
        },
      },
    },
    healthCheck: {
      enabled: true,
      intervalSeconds: 60,
      endpoint: `/api/v1/${meta.slug}/health`,
    },
    fallback: {
      enabled: false,
    },
  };
}

/**
 * Zkontroluje, zda cílový adresář koliduje a zda je povoleno přepsání.
 */
function checkTargetCollision(targetDir: string, overwrite: boolean): void {
  if (fs.existsSync(targetDir)) {
    const stat = fs.statSync(targetDir);
    if (stat.isDirectory()) {
      const items = fs.readdirSync(targetDir);
      if (items.length > 0 && !overwrite) {
        throw new Error(
          `Cílový adresář '${targetDir}' již existuje a není prázdný. Použijte parametr '--overwrite' pro vynucení přepsání.`
        );
      }
    } else if (!overwrite) {
      throw new Error(
        `Cílová cesta '${targetDir}' již existuje a je to soubor. Použijte parametr '--overwrite' pro vynucení přepsání.`
      );
    }
  }
}

/**
 * Synchronní deterministický generátor modulu.
 */
export function scaffoldModule(options: ScaffoldModuleOptions): ScaffoldResult {
  const meta = normalizeScaffoldMetadata(options);

  // 1. Ochrana proti kolizi
  checkTargetCollision(meta.targetDir, meta.overwrite);

  // 2. Vytvoření a validace manifestu před zápisem
  const manifestObject = buildManifestObject(meta);
  validateModuleManifest(manifestObject);

  // 3. Vygenerování souborů
  const files = generateModuleFiles(meta);

  // 4. Zápis na disk, pokud nejde o dry-run
  if (!meta.dryRun) {
    for (const file of files) {
      const dir = path.dirname(file.fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file.fullPath, file.content, "utf8");
    }
  }

  return {
    success: true,
    moduleKey: meta.moduleKey,
    targetDir: meta.targetDir,
    files,
    manifest: manifestObject,
    dryRun: meta.dryRun,
  };
}
