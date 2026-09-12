const fs = require('fs');
const path = '/tmp/dev4/packages/module-engine/src/lifecycle/lifecycle.engine.ts';
let content = fs.readFileSync(path, 'utf8');

// Update imports
content = content.replace(
  'import type {\n  IModuleRegistry,\n  IModuleRegistryRecord,\n} from "../registry/registry.types.js";',
  'import type {\n  IModuleRegistry,\n  IMutableModuleRegistry,\n  IModuleRegistryRecord,\n} from "../registry/registry.types.js";'
);

// Update allowed previous states
content = content.replace(
`const ALLOWED_PREVIOUS_STATES: Record<
  ModuleLifecycleTransition,
  readonly ModuleLifecycleState[]
> = {
  install: ["uninstalled", "failed"],
  enable: ["installed", "disabled", "failed"],
  disable: ["enabled", "failed"],
  uninstall: ["installed", "disabled", "enabled", "failed"],
};`,
`const ALLOWED_PREVIOUS_STATES: Record<
  ModuleLifecycleTransition,
  readonly ModuleLifecycleState[]
> = {
  install: ["uninstalled"],
  enable: ["installed", "disabled"],
  disable: ["enabled"],
  uninstall: ["installed", "disabled", "enabled", "failed"],
};`
);

// Update constructor and registry field
content = content.replace(
`export class ModuleLifecycleEngine implements IModuleLifecycleEngine {
  public readonly registry: IModuleRegistry;
  public readonly resolver: IDependencyResolver;
  public readonly gate: IModuleGate;
  private readonly options: ModuleLifecycleEngineOptions;

  constructor(
    registry: IModuleRegistry,`,
`export class ModuleLifecycleEngine implements IModuleLifecycleEngine {
  private readonly mutableRegistry: IMutableModuleRegistry;
  public readonly registry: IModuleRegistry;
  public readonly resolver: IDependencyResolver;
  public readonly gate: IModuleGate;
  private readonly options: ModuleLifecycleEngineOptions;

  constructor(
    registry: IMutableModuleRegistry,`
);

content = content.replace(
`  constructor(
    registry: IMutableModuleRegistry,
    resolver?: IDependencyResolver,
    gate?: IModuleGate,
    options?: ModuleLifecycleEngineOptions
  ) {
    this.registry = registry;`,
`  constructor(
    registry: IMutableModuleRegistry,
    resolver?: IDependencyResolver,
    gate?: IModuleGate,
    options?: ModuleLifecycleEngineOptions
  ) {
    this.mutableRegistry = registry;
    this.registry = registry;`
);

// Remove unregister public method
content = content.replace(
`  /**
   * Zcela odregistruje modul z registru včetně smazání jeho rout.
   */
  public unregister(moduleKey: string): void {
    this.registry.unregister(moduleKey);
  }
`,
``
);

// Update all this.registry.<mutation> to this.mutableRegistry.<mutation>
content = content.replace(/this\.registry\.recordState/g, 'this.mutableRegistry.recordState');
content = content.replace(/this\.registry\.unregister/g, 'this.mutableRegistry.unregister');

// Remove force checks
content = content.replace(
`} else if (transition === "disable" && !options?.force) {`,
`} else if (transition === "disable") {`
);
content = content.replace(
`} else if (transition === "uninstall" && !options?.force) {`,
`} else if (transition === "uninstall") {`
);

fs.writeFileSync(path, content, 'utf8');
