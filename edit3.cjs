const fs = require('fs');

const path = '/tmp/dev4/packages/module-engine/src/registry/registry.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '  IModuleRegistry,',
  '  IModuleRegistry,\n  IMutableModuleRegistry,'
);

fs.writeFileSync(path, content, 'utf8');
