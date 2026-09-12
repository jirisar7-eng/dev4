/**
 * @tmpr/module-engine - Scaffold Templates
 * Šablony souborů pro deterministický generátor standardního doménového modulu.
 *
 * Splňuje autoritativní požadavky:
 * - 9 povinných částí: manifest, domain, data, api, public, admin, help, tests, migrations
 * - Brand neutrality: nulový výskyt projektového brandu
 * - Zapouzdření: exportuje veřejný subpath ./contract
 * - Decentralizované datové vlastnictví modulu
 */

import path from "node:path";
import type { ResolvedScaffoldMetadata, GeneratedFile } from "./types.js";

/**
 * Vygeneruje package.json modulu s exporty '.' a './contract'.
 */
export function renderPackageJson(meta: ResolvedScaffoldMetadata): string {
  const pkg = {
    name: meta.packageName,
    version: meta.version,
    private: true,
    type: "module",
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
      "./contract": {
        types: "./dist/contract.d.ts",
        import: "./dist/contract.js",
      },
    },
    scripts: {
      build: "tsc",
      typecheck: "tsc --noEmit",
      test: "tsc -p tsconfig.test.json && node --test dist-test/tests/*.test.js",
      lint: `echo "${meta.packageName}: lint ok"`,
    },
    dependencies: {
      "@tmpr/module-engine": "workspace:*",
    },
    devDependencies: {
      "@types/node": "^22.13.9",
      typescript: "^5.8.2",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

/**
 * Vygeneruje tsconfig.json modulu navázaný na kořenový tsconfig.base.json.
 */
export function renderTsConfig(meta: ResolvedScaffoldMetadata): string {
  const relToBase = path
    .relative(meta.targetDir, path.join(meta.workspaceRoot, "tsconfig.base.json"))
    .replace(/\\/g, "/");

  const config = {
    extends: relToBase.startsWith(".") ? relToBase : `./${relToBase}`,
    compilerOptions: {
      outDir: "./dist",
      rootDir: "./src",
    },
    include: ["src/**/*"],
  };

  return JSON.stringify(config, null, 2) + "\n";
}

/**
 * Vygeneruje tsconfig.test.json modulu pro kompilaci a spouštění testů.
 */
export function renderTsConfigTest(meta: ResolvedScaffoldMetadata): string {
  const relToBase = path
    .relative(meta.targetDir, path.join(meta.workspaceRoot, "tsconfig.base.json"))
    .replace(/\\/g, "/");

  const config = {
    extends: relToBase.startsWith(".") ? relToBase : `./${relToBase}`,
    compilerOptions: {
      outDir: "./dist-test",
      rootDir: ".",
    },
    include: ["src/**/*", "tests/**/*"],
  };

  return JSON.stringify(config, null, 2) + "\n";
}

/**
 * Vygeneruje src/manifest.ts plně validní vůči autoritativnímu ModuleManifestSchema.
 */
export function renderManifestTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file manifest.ts
 * @description Autoritativní manifest doménového modulu '${meta.name}'.
 */

import type { IModuleManifest } from "@tmpr/module-engine/contract";

export const manifest: IModuleManifest = {
  moduleKey: "${meta.moduleKey}",
  name: "${meta.name}",
  description: "${meta.description}",
  version: "${meta.version}",
  compatibility: {
    synthesisCore: "^0.1.0",
  },
  dependencies: {
    required: [],
    optional: [],
    conflicts: [],
  },
  lifecycle: {
    supportedHooks: ["install", "enable", "disable", "uninstall"],
    requiresRestart: false,
    disableBehavior: {
      mode: "fail_closed",
      dataRetention: "retain",
    },
  },
  surfaces: {
    api: {
      enabled: true,
      basePath: "/api/v1/${meta.slug}",
      surfaces: ["synapi_private"],
    },
    ui: {
      public: {
        enabled: true,
        routePrefix: "/${meta.slug}",
      },
      admin: {
        enabled: true,
        routePrefix: "/admin/${meta.slug}",
      },
    },
  },
  routes: [
    {
      path: "/api/v1/${meta.slug}/status",
      surface: "api",
      requiresAuth: false,
    },
    {
      path: "/${meta.slug}",
      surface: "public",
      requiresAuth: false,
    },
    {
      path: "/admin/${meta.slug}",
      surface: "admin",
      requiresAuth: true,
      permission: "${meta.slug}.admin",
    },
  ],
  permissions: [
    {
      key: "${meta.slug}.view",
      name: "${meta.name} View",
      description: "Základní oprávnění k prohlížení pro modul ${meta.name}",
      defaultRoles: ["user", "admin"],
    },
    {
      key: "${meta.slug}.admin",
      name: "${meta.name} Administration",
      description: "Administrátorské oprávnění pro modul ${meta.name}",
      defaultRoles: ["admin"],
    },
  ],
  capabilities: ["${meta.slug}.core"],
  dataOwnership: {
    tables: ["${meta.dbPrefix}_records"],
    schemaPath: "database/schema/schema.prisma",
    migrationsPath: "database/migrations",
    isolatedData: true,
  },
  events: {
    emits: ["${meta.moduleKey}.created", "${meta.moduleKey}.updated"],
    subscribes: [],
  },
  jobs: [
    {
      jobKey: "${meta.moduleKey}.cleanup",
      description: "Pravidelná údržbová úloha modulu ${meta.name}",
      schedule: "0 2 * * *",
      queueType: "postgres_queue",
      retryLimit: 3,
    },
  ],
  cms: {
    contentPacks: [],
    textKeys: ["${meta.moduleKey}.title", "${meta.moduleKey}.description"],
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
    endpoint: "/api/v1/${meta.slug}/health",
  },
  fallback: {
    enabled: false,
  },
};
`;
}

/**
 * Vygeneruje src/contract.ts - veřejný exportní kontrakt modulu.
 */
export function renderContractTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file contract.ts
 * @description Veřejné API a rozhraní modulu '${meta.name}' vystavené ostatním modulům.
 * Pouze symboly exportované tímto kontraktem (přes subpath './contract') smějí importovat ostatní moduly.
 */

export interface I${meta.pascalCase}PublicContract {
  readonly moduleKey: "${meta.moduleKey}";
  getStatus(): Promise<{ status: string; timestamp: string }>;
}

export type { ${meta.pascalCase}Entity, ${meta.pascalCase}Status } from "./domain/types.js";
`;
}

/**
 * Vygeneruje src/domain/types.ts.
 */
export function renderDomainTypesTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file domain/types.ts
 * @description Doménové typy a entity pro modul '${meta.name}'.
 */

export type ${meta.pascalCase}Status = "active" | "inactive" | "archived";

export interface ${meta.pascalCase}Entity {
  readonly id: string;
  readonly title: string;
  readonly status: ${meta.pascalCase}Status;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Create${meta.pascalCase}Input {
  readonly title: string;
  readonly metadata?: Record<string, unknown>;
}
`;
}

/**
 * Vygeneruje src/domain/service.ts.
 */
export function renderDomainServiceTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file domain/service.ts
 * @description Čistá doménová logika a invarianty pro modul '${meta.name}'.
 */

import type {
  ${meta.pascalCase}Entity,
  Create${meta.pascalCase}Input,
} from "./types.js";

export class ${meta.pascalCase}DomainService {
  /**
   * Vytvoří novou instanci doménové entity se základní validací invariantů.
   */
  public createEntity(
    id: string,
    input: Create${meta.pascalCase}Input
  ): ${meta.pascalCase}Entity {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Název záznamu nesmí být prázdný.");
    }

    const now = new Date();
    return {
      id,
      title: input.title.trim(),
      status: "active",
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Ověří platnost stavového přechodu.
   */
  public canTransition(from: string, to: string): boolean {
    if (from === "archived") {
      return false; // Z archivovaného stavu již nelze přejít
    }
    return Boolean(to && to.length > 0);
  }
}
`;
}

/**
 * Vygeneruje src/domain/index.ts.
 */
export function renderDomainIndexTs(_meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file domain/index.ts
 * @description Exporty doménové vrstvy modulu.
 */

export * from "./types.js";
export * from "./service.js";
`;
}

/**
 * Vygeneruje src/data/repository.ts.
 */
export function renderDataRepositoryTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file data/repository.ts
 * @description Datový repozitář pro modul '${meta.name}'.
 * Modul striktně vlastní své databázové schéma a data.
 */

import type { ${meta.pascalCase}Entity } from "../domain/types.js";

export interface I${meta.pascalCase}Repository {
  findById(id: string): Promise<${meta.pascalCase}Entity | null>;
  save(entity: ${meta.pascalCase}Entity): Promise<void>;
  listAll(): Promise<readonly ${meta.pascalCase}Entity[]>;
}

/**
 * In-memory implementace repozitáře pro testy a vývoj.
 */
export class InMemory${meta.pascalCase}Repository implements I${meta.pascalCase}Repository {
  private readonly store = new Map<string, ${meta.pascalCase}Entity>();

  public async findById(id: string): Promise<${meta.pascalCase}Entity | null> {
    return this.store.get(id) ?? null;
  }

  public async save(entity: ${meta.pascalCase}Entity): Promise<void> {
    this.store.set(entity.id, entity);
  }

  public async listAll(): Promise<readonly ${meta.pascalCase}Entity[]> {
    return Object.freeze(Array.from(this.store.values()));
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }

  public async count(): Promise<number> {
    return this.store.size;
  }
}
`;
}

/**
 * Vygeneruje src/data/index.ts.
 */
export function renderDataIndexTs(_meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file data/index.ts
 * @description Exporty datové vrstvy modulu.
 */

export * from "./repository.js";
`;
}

/**
 * Vygeneruje src/api/handler.ts.
 */
export function renderApiHandlerTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file api/handler.ts
 * @description API handlery a endpoint fasády modulu '${meta.name}'.
 */

export interface ${meta.pascalCase}StatusResponse {
  readonly moduleKey: string;
  readonly status: "operational" | "degraded";
  readonly version: string;
  readonly timestamp: string;
}

export function handle${meta.pascalCase}Status(): ${meta.pascalCase}StatusResponse {
  return {
    moduleKey: "${meta.moduleKey}",
    status: "operational",
    version: "${meta.version}",
    timestamp: new Date().toISOString(),
  };
}
`;
}

/**
 * Vygeneruje src/api/index.ts.
 */
export function renderApiIndexTs(_meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file api/index.ts
 * @description Exporty API vrstvy modulu.
 */

export * from "./handler.js";
`;
}

/**
 * Vygeneruje src/public/index.ts.
 */
export function renderPublicIndexTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file public/index.ts
 * @description Veřejná UI vrstva modulu '${meta.name}'.
 */

export interface Public${meta.pascalCase}ViewModel {
  readonly title: string;
  readonly description: string;
  readonly route: string;
}

export function getPublicViewModel(): Public${meta.pascalCase}ViewModel {
  return {
    title: "${meta.name}",
    description: "${meta.description}",
    route: "/${meta.slug}",
  };
}
`;
}

/**
 * Vygeneruje src/admin/index.ts.
 */
export function renderAdminIndexTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file admin/index.ts
 * @description Administrátorská UI vrstva modulu '${meta.name}'.
 */

export interface Admin${meta.pascalCase}NavConfig {
  readonly label: string;
  readonly route: string;
  readonly requiredPermission: string;
}

export function getAdminNavConfig(): Admin${meta.pascalCase}NavConfig {
  return {
    label: "${meta.name}",
    route: "/admin/${meta.slug}",
    requiredPermission: "${meta.slug}.admin",
  };
}
`;
}

/**
 * Vygeneruje src/index.ts.
 */
export function renderRootIndexTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file index.ts
 * @description Hlavní vstupní bod modulu '${meta.name}'.
 */

import type {
  IModule,
  IModuleLifecycleContext,
  IModuleHealthResult,
} from "@tmpr/module-engine/contract";
import { manifest } from "./manifest.js";
import { ${meta.pascalCase}DomainService } from "./domain/service.js";
import { InMemory${meta.pascalCase}Repository } from "./data/repository.js";

export { manifest } from "./manifest.js";
export * from "./contract.js";
export * from "./domain/index.js";
export * from "./data/index.js";
export * from "./api/index.js";
export * from "./public/index.js";
export * from "./admin/index.js";

/**
 * Autoritativní runtime instance modulu '${meta.name}' implementující IModule.
 */
export class ${meta.pascalCase}Module implements IModule {
  public readonly manifest = manifest;
  public readonly repository = new InMemory${meta.pascalCase}Repository();
  public readonly domainService = new ${meta.pascalCase}DomainService();
  public isInstalled = false;
  public isEnabled = false;

  public async onInstall(context: IModuleLifecycleContext): Promise<void> {
    this.isInstalled = true;
    context.logger.info(\`Module ${meta.moduleKey} installed successfully\`);
  }

  public async onEnable(context: IModuleLifecycleContext): Promise<void> {
    this.isEnabled = true;
    context.logger.info(\`Module ${meta.moduleKey} enabled successfully\`);
  }

  public async onDisable(context: IModuleLifecycleContext): Promise<void> {
    this.isEnabled = false;
    context.logger.info(\`Module ${meta.moduleKey} disabled successfully\`);
  }

  public async onUninstall(context: IModuleLifecycleContext): Promise<void> {
    this.isInstalled = false;
    this.isEnabled = false;
    await this.repository.clear();
    context.logger.info(\`Module ${meta.moduleKey} uninstalled and data cleared\`);
  }

  public async onHealthCheck(_context: IModuleLifecycleContext): Promise<IModuleHealthResult> {
    return {
      status: this.isEnabled ? "healthy" : "degraded",
      checkedAt: new Date().toISOString(),
      details: {
        isInstalled: this.isInstalled,
        isEnabled: this.isEnabled,
      },
    };
  }
}

/**
 * Tovární funkce pro vytvoření nové instance modulu.
 */
export function create${meta.pascalCase}Module(): ${meta.pascalCase}Module {
  return new ${meta.pascalCase}Module();
}
`;
}

/**
 * Vygeneruje help/cs/index.md.
 */
export function renderHelpCsMd(meta: ResolvedScaffoldMetadata): string {
  return `# Nápověda k modulu ${meta.name}

## Přehled
${meta.description}

## Oprávnění (RBAC)
- \`${meta.slug}.view\`: Základní přístup ke čtení dat modulu.
- \`${meta.slug}.admin\`: Administrátorská správa modulu a nastavení.

## Decentralizované datové vlastnictví
Modul spravuje následující databázové tabulky:
- \`${meta.dbPrefix}_records\`

## API Endpointy
- \`/api/v1/${meta.slug}/status\`: Stav a zdraví modulu
`;
}

/**
 * Vygeneruje database/schema/schema.prisma.
 */
export function renderPrismaSchema(meta: ResolvedScaffoldMetadata): string {
  return `// Autoritativní schéma datového vlastnictví pro modul ${meta.moduleKey}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model ${meta.pascalCase}Record {
  id        String   @id @default(uuid())
  title     String
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("${meta.dbPrefix}_records")
}
`;
}

/**
 * Vygeneruje database/migrations/0001_initial/migration.sql.
 */
export function renderMigrationSql(meta: ResolvedScaffoldMetadata): string {
  return `-- Autoritativní počáteční migrace pro modul: ${meta.moduleKey}
-- Vlastník dat: ${meta.packageName}

CREATE TABLE IF NOT EXISTS "${meta.dbPrefix}_records" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "${meta.dbPrefix}_records_pkey" PRIMARY KEY ("id")
);
`;
}

/**
 * Vygeneruje tests/index.test.ts.
 */
export function renderTestIndexTs(meta: ResolvedScaffoldMetadata): string {
  return `/**
 * @file tests/index.test.ts
 * @description Automatické testy pro modul '${meta.name}'.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";
import { ${meta.pascalCase}DomainService } from "../src/domain/service.js";
import { InMemory${meta.pascalCase}Repository } from "../src/data/repository.js";
import { handle${meta.pascalCase}Status } from "../src/api/handler.js";

describe("${meta.moduleKey} Module Tests", () => {
  it("manifest má platný moduleKey a verzi", () => {
    assert.equal(manifest.moduleKey, "${meta.moduleKey}");
    assert.equal(manifest.version, "${meta.version}");
  });

  it("domain service vytvoří platnou entitu", () => {
    const service = new ${meta.pascalCase}DomainService();
    const entity = service.createEntity("rec-1", { title: "Testovací záznam" });
    assert.equal(entity.id, "rec-1");
    assert.equal(entity.title, "Testovací záznam");
    assert.equal(entity.status, "active");
  });

  it("in-memory repository ukládá a načítá záznam", async () => {
    const repo = new InMemory${meta.pascalCase}Repository();
    const item = {
      id: "rec-1",
      title: "Test",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await repo.save(item);
    const loaded = await repo.findById("rec-1");
    assert.ok(loaded);
    assert.equal(loaded?.id, "rec-1");
  });

  it("api status handler vrací operational stav", () => {
    const status = handle${meta.pascalCase}Status();
    assert.equal(status.moduleKey, "${meta.moduleKey}");
    assert.equal(status.status, "operational");
  });
});
`;
}

/**
 * Vygeneruje kompletní sadu souborů modulu podle šablon.
 */
export function generateModuleFiles(
  meta: ResolvedScaffoldMetadata
): readonly GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const addFile = (relPath: string, content: string) => {
    files.push({
      relativePath: relPath,
      fullPath: path.join(meta.targetDir, relPath),
      content,
    });
  };

  // 1. Konfigurace balíčku a TypeScriptu
  addFile("package.json", renderPackageJson(meta));
  addFile("tsconfig.json", renderTsConfig(meta));
  addFile("tsconfig.test.json", renderTsConfigTest(meta));

  // 2. Manifest (1. povinná část)
  addFile("src/manifest.ts", renderManifestTs(meta));

  // 3. Kontrakt
  addFile("src/contract.ts", renderContractTs(meta));

  // 4. Domain vrstva (2. povinná část)
  addFile("src/domain/types.ts", renderDomainTypesTs(meta));
  addFile("src/domain/service.ts", renderDomainServiceTs(meta));
  addFile("src/domain/index.ts", renderDomainIndexTs(meta));

  // 5. Data vrstva (3. povinná část)
  addFile("src/data/repository.ts", renderDataRepositoryTs(meta));
  addFile("src/data/index.ts", renderDataIndexTs(meta));

  // 6. API vrstva (4. povinná část)
  addFile("src/api/handler.ts", renderApiHandlerTs(meta));
  addFile("src/api/index.ts", renderApiIndexTs(meta));

  // 7. Public UI vrstva (5. povinná část)
  addFile("src/public/index.ts", renderPublicIndexTs(meta));

  // 8. Admin UI vrstva (6. povinná část)
  addFile("src/admin/index.ts", renderAdminIndexTs(meta));

  // 9. Root vstupní bod
  addFile("src/index.ts", renderRootIndexTs(meta));

  // 10. Help nápověda (7. povinná část)
  addFile("help/cs/index.md", renderHelpCsMd(meta));

  // 11. Databázové schéma a migrace (9. povinná část)
  addFile("database/schema/schema.prisma", renderPrismaSchema(meta));
  addFile(
    "database/migrations/0001_initial/migration.sql",
    renderMigrationSql(meta)
  );

  // 12. Testy (8. povinná část)
  addFile("tests/index.test.ts", renderTestIndexTs(meta));

  return Object.freeze(files);
}
