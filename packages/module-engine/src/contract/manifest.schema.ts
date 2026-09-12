/**
 * @tmpr/module-engine - Module Manifest Schema & Validations
 * Autoritativní Zod schéma pro strojovou validaci manifestu modulu.
 */

import { z } from "zod";
import semver from "semver";

/**
 * Kanonický regulární výraz pro Namespaced Module Key:
 * - minimálně dvě části oddělené tečkou
 * - lowercase alfanumerické znaky, uvnitř částí povoleny pomlčky
 * - žádné prázdné části, žádné úvodní/koncové tečky, žádné dvojité tečky, žádná podtržítka, žádná velká písmena
 */
export const NAMESPACED_MODULE_KEY_REGEX =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export const moduleKeyRegex = NAMESPACED_MODULE_KEY_REGEX;

/**
 * Validátor striktního SemVeru:
 * - musí být platný SemVer
 * - nesmí mít předponu 'v' či 'V'
 * - podporuje 1.0.0, 1.2.3-beta.1, 1.2.3+build.5, 1.2.3-beta.1+build.5
 * - odmítá v1.0.0, 1.0, 1, 01.0.0, not-semver
 */
export function isValidSemver(val: string): boolean {
  if (typeof val !== "string" || /^v/i.test(val)) return false;
  const parsed = semver.parse(val, { loose: false });
  if (!parsed) return false;
  return parsed.raw === val;
}

/**
 * Validátor SemVer range:
 * - validní např: *, ^1.0.0, ~1.2.0, >=1.0.0 <2.0.0
 * - odmítá prázdné řetězce a neplatné rozsahy
 */
export function isValidSemverRange(val: string): boolean {
  if (typeof val !== "string" || val.trim().length === 0) return false;
  return semver.validRange(val) !== null;
}

export const ModuleKeySchema = z
  .string()
  .regex(
    NAMESPACED_MODULE_KEY_REGEX,
    "Klíč modulu (moduleKey) musí mít formát jmenného prostoru s tečkovou notací a malými písmeny (např. family.alimony nebo platform.module-engine)"
  );

export const SemverVersionSchema = z
  .string()
  .refine(
    (val) => isValidSemver(val),
    {
      message:
        "Verze (version) musí být striktní platný SemVer řetězec bez prefixu 'v' (např. 1.0.0, 1.2.3-beta.1, 1.2.3+build.5)"
    }
  );

export const SemverRangeSchema = z
  .string()
  .refine(
    (val) => isValidSemverRange(val),
    {
      message:
        "Rozsah verzí (versionRange) musí být platný SemVer rozsah (např. *, ^1.0.0, ~1.2.0, >=1.0.0 <2.0.0)"
    }
  );

/**
 * Schéma závislosti na jiném modulu.
 */
export const ModuleDependencySchema = z.object({
  moduleKey: ModuleKeySchema,
  versionRange: SemverRangeSchema.default("*"),
  reason: z.string().optional()
});

/**
 * Schéma konfliktu s jiným modulem.
 */
export const ModuleConflictSchema = z.object({
  moduleKey: ModuleKeySchema,
  reason: z.string().min(1, "Důvod konfliktu (reason) musí být zadán")
});

/**
 * Schéma pro jednotlivou UI surface (public, account, admin).
 */
export const UiSurfaceItemSchema = z.object({
  enabled: z.boolean().default(false),
  routePrefix: z.string().optional(),
  entryPoint: z.string().optional()
});

/**
 * Schéma chování při deaktivaci modulu.
 */
export const DisableBehaviorSchema = z.object({
  mode: z.enum(["fail_closed", "graceful_degrade", "hide"]).default("fail_closed"),
  fallbackMessage: z.string().optional(),
  dataRetention: z.enum(["retain", "archive", "purge"]).default("retain")
});

/**
 * Schéma životního cyklu modulu.
 */
export const ModuleLifecycleSchema = z.object({
  supportedHooks: z
    .array(z.enum(["install", "enable", "disable", "uninstall"]))
    .default(["enable", "disable"]),
  requiresRestart: z.boolean().default(false),
  disableBehavior: DisableBehaviorSchema.default({
    mode: "fail_closed",
    dataRetention: "retain"
  })
});

/**
 * Schéma povrchů (Surfaces) modulu: API a UI (public, account, admin).
 * Používá .strict() pro odmítnutí neznámých surfaces!
 */
export const ModuleSurfacesSchema = z
  .object({
    api: z
      .object({
        enabled: z.boolean().default(false),
        basePath: z.string().optional(),
        surfaces: z
          .array(z.enum(["internal", "synapi_private", "synapi_public"]))
          .default([])
      })
      .default({ enabled: false, surfaces: [] }),
    ui: z
      .object({
        public: UiSurfaceItemSchema.optional(),
        account: UiSurfaceItemSchema.optional(),
        admin: UiSurfaceItemSchema.optional()
      })
      .strict("Zadána neznámá UI surface; povolené surfaces jsou public, account, admin")
      .default({})
  })
  .strict("Zadána neznámá kategorie surface; povoleny jsou pouze api a ui");

/**
 * Schéma cesty / routy modulu.
 */
export const ModuleRouteSchema = z.object({
  path: z.string().min(1, "Cesta routy (path) nesmí být prázdná"),
  surface: z.enum(["public", "account", "admin", "api"]),
  requiresAuth: z.boolean().default(false),
  permission: z.string().optional()
});

/**
 * Schéma oprávnění modulu.
 */
export const ModulePermissionSchema = z.object({
  key: z.string().min(1, "Klíč oprávnění (key) nesmí být prázdný"),
  name: z.string().min(1, "Název oprávnění (name) nesmí být prázdný"),
  description: z.string().min(1, "Popis oprávnění (description) nesmí být prázdný"),
  defaultRoles: z.array(z.string()).default([])
});

/**
 * Schéma decentralizovaného datového vlastnictví.
 * Každý modul striktně vlastní své tabulky a migrace!
 */
export const ModuleDataOwnershipSchema = z.object({
  tables: z.array(z.string()).default([]),
  schemaPath: z.string().default("database/schema/schema.prisma"),
  migrationsPath: z.string().default("database/migrations"),
  isolatedData: z.boolean().default(true)
});

/**
 * Schéma doménových událostí modulu.
 */
export const ModuleEventsSchema = z.object({
  emits: z.array(z.string()).default([]),
  subscribes: z
    .array(
      z.object({
        event: z.string().min(1),
        handler: z.string().optional()
      })
    )
    .default([])
});

/**
 * Schéma asynchronních úloh modulu (PostgreSQL-backed queue).
 */
export const ModuleJobSchema = z.object({
  jobKey: z.string().min(1, "Klíč úlohy (jobKey) nesmí být prázdný"),
  description: z.string().min(1, "Popis úlohy (description) nesmí být prázdný"),
  schedule: z.string().optional(),
  queueType: z.literal("postgres_queue").default("postgres_queue"),
  retryLimit: z.number().int().nonnegative().default(3)
});

/**
 * Schéma CMS integrace, šablon a nápovědy.
 */
export const ModuleCmsSchema = z.object({
  contentPacks: z
    .array(
      z.object({
        packKey: z.string().min(1),
        path: z.string().min(1)
      })
    )
    .default([]),
  textKeys: z.array(z.string()).default([]),
  help: z
    .object({
      cs: z
        .object({
          enabled: z.boolean().default(false),
          path: z.string().default("help/cs")
        })
        .default({ enabled: false, path: "help/cs" })
    })
    .default({ cs: { enabled: false, path: "help/cs" } })
});

/**
 * Schéma kontroly zdraví (Health Check).
 */
export const ModuleHealthCheckSchema = z.object({
  enabled: z.boolean().default(false),
  intervalSeconds: z.number().int().positive().default(60),
  endpoint: z.string().optional()
});

/**
 * Schéma fallbacku při nedostupnosti.
 */
export const ModuleFallbackSchema = z.object({
  enabled: z.boolean().default(false),
  handlerPath: z.string().optional(),
  defaultResponse: z.string().optional()
});

/**
 * HLAVNÍ AUTORITATIVNÍ SCHÉMA MANIFESTU MODULU.
 */
export const ModuleManifestSchema = z
  .object({
    moduleKey: ModuleKeySchema,
    name: z.string().min(1, "Název modulu (name) je povinný"),
    description: z.string().min(1, "Popis modulu (description) je povinný"),
    version: SemverVersionSchema,
    compatibility: z.object({
      synthesisCore: SemverRangeSchema,
      synthesisCms: z
        .string()
        .refine((val) => isValidSemverRange(val), {
          message: "synthesisCms musí být platný SemVer rozsah, pokud je zadán"
        })
        .optional()
    }),
    dependencies: z
      .object({
        required: z.array(ModuleDependencySchema).default([]),
        optional: z.array(ModuleDependencySchema).default([]),
        conflicts: z.array(ModuleConflictSchema).default([])
      })
      .default({ required: [], optional: [], conflicts: [] }),
    lifecycle: ModuleLifecycleSchema.default({
      supportedHooks: ["enable", "disable"],
      requiresRestart: false,
      disableBehavior: { mode: "fail_closed", dataRetention: "retain" }
    }),
    surfaces: ModuleSurfacesSchema.default({
      api: { enabled: false, surfaces: [] },
      ui: {}
    }),
    routes: z.array(ModuleRouteSchema).default([]),
    permissions: z.array(ModulePermissionSchema).default([]),
    capabilities: z.array(z.string()).default([]),
    dataOwnership: ModuleDataOwnershipSchema.default({
      tables: [],
      schemaPath: "database/schema/schema.prisma",
      migrationsPath: "database/migrations",
      isolatedData: true
    }),
    events: ModuleEventsSchema.default({ emits: [], subscribes: [] }),
    jobs: z.array(ModuleJobSchema).default([]),
    cms: ModuleCmsSchema.default({
      contentPacks: [],
      textKeys: [],
      help: { cs: { enabled: false, path: "help/cs" } }
    }),
    healthCheck: ModuleHealthCheckSchema.default({
      enabled: false,
      intervalSeconds: 60
    }),
    fallback: ModuleFallbackSchema.default({
      enabled: false
    })
  })
  .superRefine((data, ctx) => {
    const { moduleKey, dependencies } = data;

    // 1. Kontrola self-dependency v required
    const selfRequired = dependencies.required.some((d) => d.moduleKey === moduleKey);
    if (selfRequired) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Modul '" + moduleKey + "' nemůže záviset sám na sobě v povinných závislostech (required)",
        path: ["dependencies", "required"]
      });
    }

    // 2. Kontrola self-dependency v optional
    const selfOptional = dependencies.optional.some((d) => d.moduleKey === moduleKey);
    if (selfOptional) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Modul '" + moduleKey + "' nemůže záviset sám na sobě ve volitelných závislostech (optional)",
        path: ["dependencies", "optional"]
      });
    }

    // 3. Kontrola conflict se sebou samým
    const selfConflict = dependencies.conflicts.some((c) => c.moduleKey === moduleKey);
    if (selfConflict) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Modul '" + moduleKey + "' nemůže deklarovat konflikt sám se sebou",
        path: ["dependencies", "conflicts"]
      });
    }

    // 4. Kontrola duplicit v required dependencies
    const requiredKeys = new Set<string>();
    for (const dep of dependencies.required) {
      if (requiredKeys.has(dep.moduleKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicitní závislost '" + dep.moduleKey + "' v povinných závislostech (required)",
          path: ["dependencies", "required"]
        });
      }
      requiredKeys.add(dep.moduleKey);
    }

    // 5. Kontrola duplicit v optional dependencies
    const optionalKeys = new Set<string>();
    for (const dep of dependencies.optional) {
      if (optionalKeys.has(dep.moduleKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicitní závislost '" + dep.moduleKey + "' ve volitelných závislostech (optional)",
          path: ["dependencies", "optional"]
        });
      }
      optionalKeys.add(dep.moduleKey);
    }

    // 6. Kontrola duplicity mezi required a optional
    for (const reqKey of requiredKeys) {
      if (optionalKeys.has(reqKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Závislost '" + reqKey + "' nemůže být současně povinná (required) i volitelná (optional)",
          path: ["dependencies"]
        });
      }
    }
  });
