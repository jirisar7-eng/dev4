const fs = require('fs');

const path = '/tmp/dev4/packages/module-engine/src/registry/registry.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'import type { IModuleRegistry, IModuleRegistryRecord, ModuleRegistryOptions } from "./registry.types.js";',
  'import type { IModuleRegistry, IMutableModuleRegistry, IModuleRegistryRecord, ModuleRegistryOptions } from "./registry.types.js";'
);

content = content.replace(
  'export class ModuleRegistry implements IModuleRegistry {',
  'export class ModuleRegistry implements IMutableModuleRegistry {'
);

fs.writeFileSync(path, content, 'utf8');
