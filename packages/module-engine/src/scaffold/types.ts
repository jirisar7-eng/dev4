/**
 * @tmpr/module-engine - Scaffold Types
 * Typové definice pro generátor standardního doménového modulu.
 */

import type { IModuleManifest } from "../contract/types.js";

/**
 * Možnosti předávané do generátoru modulu.
 */
export interface ScaffoldModuleOptions {
  /**
   * Namespaced module key (např. 'family.alimony' nebo 'custom.sample-module').
   * Musí striktně odpovídat NAMESPACED_MODULE_KEY_REGEX.
   */
  moduleKey: string;

  /**
   * Lidsky čitelný název modulu.
   * Pokud není zadán, je odvozen z moduleKey (např. 'Family Alimony').
   */
  name?: string;

  /**
   * Popis účelu a odpovědnosti modulu.
   * Pokud není zadán, je vygenerován generický neutrální popis.
   */
  description?: string;

  /**
   * Počáteční SemVer verze modulu (výchozí: '0.1.0').
   */
  version?: string;

  /**
   * Cílový adresář pro vytvoření modulu.
   * Pokud není zadán, je odvozen jako '<workspaceRoot>/modules/<slug>'.
   */
  targetDir?: string;

  /**
   * Kořenový adresář monorepa (workspace root).
   * Pokud není zadán, je detekován automaticky.
   */
  workspaceRoot?: string;

  /**
   * Povolit přepsání existujícího neprázdného cílového adresáře.
   * Výchozí: false (bezpečné odmítnutí kolize).
   */
  overwrite?: boolean;

  /**
   * Režim náhledu bez zápisu souborů na disk.
   * Výchozí: false.
   */
  dryRun?: boolean;
}

/**
 * Normalizovaná a plně doplněná konfigurace modulu pro šablonovací engine.
 */
export interface ResolvedScaffoldMetadata {
  readonly moduleKey: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly slug: string;             // např. 'family-alimony'
  readonly packageName: string;      // např. '@tmpr/family-alimony'
  readonly dbPrefix: string;         // např. 'family_alimony'
  readonly pascalCase: string;       // např. 'FamilyAlimony'
  readonly camelCase: string;        // např. 'familyAlimony'
  readonly targetDir: string;
  readonly workspaceRoot: string;
  readonly overwrite: boolean;
  readonly dryRun: boolean;
}

/**
 * Vygenerovaný soubor v paměti.
 */
export interface GeneratedFile {
  readonly relativePath: string;
  readonly fullPath: string;
  readonly content: string;
}

/**
 * Výsledek operace scaffoldingu.
 */
export interface ScaffoldResult {
  readonly success: boolean;
  readonly moduleKey: string;
  readonly targetDir: string;
  readonly files: readonly GeneratedFile[];
  readonly manifest: IModuleManifest;
  readonly dryRun: boolean;
  readonly error?: string;
}
