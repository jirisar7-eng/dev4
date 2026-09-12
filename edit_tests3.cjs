const fs = require('fs');

const path = '/tmp/dev4/packages/module-engine/tests/lifecycle.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
`      registry = new ModuleRegistry({ logger: { info: () => {}, warn: () => {}, error: () => {} } });`,
`      registry = new ModuleRegistry();`
);

content = content.replace(/const manifest = \{[\s\S]*?metadata: \{ title: "Test" \},\n      \};/g, `const manifest = {} as any;`);

fs.writeFileSync(path, content, 'utf8');
