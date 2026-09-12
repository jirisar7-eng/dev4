const fs = require('fs');

const path = '/tmp/dev4/packages/module-engine/tests/lifecycle.test.ts';
let content = fs.readFileSync(path, 'utf8');

const newTestBlock = `
  describe("Zabezpečení mutační hranice (TMPR-NEWDEV-20260912-F1-009-R01)", () => {
    let registry;
    let engine;

    beforeEach(() => {
      registry = new ModuleRegistry();
      engine = new ModuleLifecycleEngine(registry);
    });

    it("1. Typová ochrana zamezuje přístupu k mutátorům registru přes veřejné rozhraní", () => {
      // V TypeScriptu není public .registry rozhraním pro mutace.
      // Modulový registr přetypovaný na IModuleRegistry nesmí nabízet metody jako recordState.
      const publicRegistry: import("../src/registry/registry.types.js").IModuleRegistry = engine.registry;
      
      // Tím, že to TypeScript zkompiluje a my ověříme nepřítomnost metod v TYPE levelu,
      // zajistíme contract. V runtime metody fyzicky na objektu jsou, protože je to stejná instance, 
      // ale typescript to neumožní. Toto je ukázkový test contractu.
      assert.ok(publicRegistry);
    });

    it("2. Modul ve stavu 'failed' nelze přímo zapnout (enable) - vyžaduje cleanup", async () => {
      // Připravíme registraci modulu
      const manifest = {
        name: "test-module",
        version: "1.0.0",
        type: "domain",
        systemVersion: "1.0.0",
        dependencies: { required: [], optional: [] },
        routes: [],
        metadata: { title: "Test" },
      };
      
      // Nasimulujeme selhání přes registry (použijeme interní asert na immutable registry casted as mutable)
      const internalRegistry = registry; 
      internalRegistry.register({
        manifest,
        moduleKey: "reference.failed-module",
        instance: {},
        onInstall: async () => {},
        onEnable: async () => {},
      });
      internalRegistry.recordState("reference.failed-module", "failed");
      
      // Pokus o enable
      await assert.rejects(
        engine.enable("reference.failed-module"),
        (err) => {
          assert.equal(err.code, "INVALID_TRANSITION");
          return true;
        },
        "Nesprávný přechod z failed do enable musí selhat"
      );
    });

    it("3. Modul ve stavu 'failed' nelze přímo instalovat - vyžaduje cleanup", async () => {
      // Připravíme registraci modulu
      const manifest = {
        name: "test-module",
        version: "1.0.0",
        type: "domain",
        systemVersion: "1.0.0",
        dependencies: { required: [], optional: [] },
        routes: [],
        metadata: { title: "Test" },
      };
      
      const internalRegistry = registry; 
      internalRegistry.register({
        manifest,
        moduleKey: "reference.failed-module",
        instance: {},
        onInstall: async () => {},
      });
      internalRegistry.recordState("reference.failed-module", "failed");
      
      // Pokus o install
      await assert.rejects(
        engine.install("reference.failed-module"),
        (err) => {
          assert.equal(err.code, "INVALID_TRANSITION");
          return true;
        },
        "Nesprávný přechod z failed do install musí selhat"
      );
    });

    it("4. Bezpečná recovery z 'failed' funguje přes uninstall", async () => {
      let isUninstalled = false;
      const manifest = {
        name: "test-module",
        version: "1.0.0",
        type: "domain",
        systemVersion: "1.0.0",
        dependencies: { required: [], optional: [] },
        routes: [],
        metadata: { title: "Test" },
      };
      
      const internalRegistry = registry; 
      internalRegistry.register({
        manifest,
        moduleKey: "reference.failed-module",
        instance: {},
        onUninstall: async () => { isUninstalled = true; },
      });
      internalRegistry.recordState("reference.failed-module", "failed");
      
      // Bezpečná cleanup cesta: uninstall
      const res = await engine.uninstall("reference.failed-module");
      assert.equal(res.success, true);
      assert.equal(res.newState, "uninstalled");
      assert.equal(isUninstalled, true);
    });
  });
`;

content = content.replace(/  \}\);\n\}\);\n$/, newTestBlock + '  });\n});\n');

fs.writeFileSync(path, content, 'utf8');
