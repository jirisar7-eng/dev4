const fs = require('fs');

const path = '/tmp/dev4/packages/module-engine/tests/lifecycle.test.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
`    let registry;
    let engine;

    beforeEach(() => {
      registry = new ModuleRegistry();
      engine = new ModuleLifecycleEngine(registry);
    });`,
`    let registry: ModuleRegistry;
    let engine: ModuleLifecycleEngine;

    beforeEach(() => {
      registry = new ModuleRegistry({ logger: { info: () => {}, warn: () => {}, error: () => {} } });
      engine = new ModuleLifecycleEngine(registry);
    });`
);

content = content.replace(
`        (err) => {
          assert.equal(err.code, "INVALID_TRANSITION");`,
`        (err: any) => {
          assert.equal(err.code, "INVALID_TRANSITION");`
);
content = content.replace(
`        (err) => {
          assert.equal(err.code, "INVALID_TRANSITION");`,
`        (err: any) => {
          assert.equal(err.code, "INVALID_TRANSITION");`
);

fs.writeFileSync(path, content, 'utf8');
