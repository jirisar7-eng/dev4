const fs = require('fs');
const path = '/tmp/dev4/packages/module-engine/src/lifecycle/lifecycle.types.ts';
let content = fs.readFileSync(path, 'utf8');

// Odstranění 'force'
content = content.replace(
`  /**
   * Vynucená deaktivace / odinstalace i v případě, že na modulu závisí jiné moduly.
   * Výchozí: false (fail-closed, blokováno při existenci aktivních závislostí).
   */
  readonly force?: boolean;
`, ''
);

// Odstranění unregister metody z IModuleLifecycleEngine
content = content.replace(
`  /**
   * Odregistruje modul z registru a odstraní jeho routy.
   */
  unregister(moduleKey: string): void;
`, ''
);

fs.writeFileSync(path, content, 'utf8');
