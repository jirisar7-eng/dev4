/**
 * @tmpr/module-engine - Dependency Resolver Implementation
 * Autoritativní implementace vyhodnocování závislostí a detekce cyklů (Synthesis OS).
 */

import semver from "semver";
import type {
  IModuleRegistry,
  IModuleRegistryRecord
} from "../registry/registry.types.js";
import type {
  DependencyIssue,
  DependencyResolutionResult,
  IDependencyResolver
} from "./dependency.types.js";
import {
  createDependencyCycleIssue,
  createMissingRequiredDependencyIssue,
  createOptionalDependencyMissingIssue,
  createOptionalVersionIncompatibleIssue,
  createRequiredVersionIncompatibleIssue,
  createTargetNotRegisteredIssue
} from "./dependency.errors.js";
import {
  detectCycles,
  topologicalSort
} from "./dependency.graph.js";

/**
 * Deterministické seřazení nalezených problémů podle modulu, kódu a závislosti.
 */
function sortIssues(issues: readonly DependencyIssue[]): DependencyIssue[] {
  return [...issues].sort((a, b) => {
    const cmpMod = a.moduleKey.localeCompare(b.moduleKey);
    if (cmpMod !== 0) return cmpMod;
    const cmpCode = a.code.localeCompare(b.code);
    if (cmpCode !== 0) return cmpCode;
    const depA = a.dependencyKey ?? "";
    const depB = b.dependencyKey ?? "";
    const cmpDep = depA.localeCompare(depB);
    if (cmpDep !== 0) return cmpDep;
    return a.message.localeCompare(b.message);
  });
}

/**
 * Deterministické seřazení detekovaných cyklů.
 */
function sortCycles(cycles: readonly (readonly string[])[]): (readonly string[])[] {
  return [...cycles].sort((a, b) => a.join("->").localeCompare(b.join("->")));
}

/**
 * Autoritativní Dependency Resolver modulárního subsystému.
 * Pracuje výhradně s atomickými snapshoty z IModuleRegistry.
 * Resolver je striktně read-only: nemění stav registru, manifesty ani neprovádí orchestraci.
 */
export class DependencyResolver implements IDependencyResolver {
  constructor(private readonly registry: IModuleRegistry) {}

  /**
   * Analyzuje závislosti a sestaví pořadí pro cílový modul a jeho required dependency closure.
   * Nezávislé chyby v jiných (nedosažitelných) modulech tento výsledek neblokují.
   */
  public resolveFor(moduleKey: string): DependencyResolutionResult {
    const records = this.registry.listRecords();
    const recordMap = new Map<string, IModuleRegistryRecord>();
    for (const rec of records) {
      recordMap.set(rec.moduleKey, rec);
    }

    if (!recordMap.has(moduleKey)) {
      const blocker = createTargetNotRegisteredIssue(moduleKey);
      return {
        ok: false,
        resolvedOrder: [],
        blockers: [blocker],
        advisories: [],
        cycles: []
      };
    }

    const blockers: DependencyIssue[] = [];
    const advisories: DependencyIssue[] = [];
    const seenBlockers = new Set<string>();
    const seenAdvisories = new Set<string>();

    function addBlocker(issue: DependencyIssue) {
      const sig = `${issue.code}:${issue.moduleKey}:${issue.dependencyKey ?? ""}:${issue.requiredRange ?? ""}:${issue.actualVersion ?? ""}:${(issue.cycle ?? []).join("->")}`;
      if (!seenBlockers.has(sig)) {
        seenBlockers.add(sig);
        blockers.push(issue);
      }
    }

    function addAdvisory(issue: DependencyIssue) {
      const sig = `${issue.code}:${issue.moduleKey}:${issue.dependencyKey ?? ""}:${issue.requiredRange ?? ""}:${issue.actualVersion ?? ""}`;
      if (!seenAdvisories.has(sig)) {
        seenAdvisories.add(sig);
        advisories.push(issue);
      }
    }

    // BFS pro zjištění tranzitivního uzávěru povinných závislostí
    const reachable = new Set<string>();
    const queue: string[] = [moduleKey];
    reachable.add(moduleKey);

    while (queue.length > 0) {
      const currentKey = queue.shift()!;
      const record = recordMap.get(currentKey);
      if (!record) continue;

      for (const req of record.manifest.dependencies.required) {
        if (!recordMap.has(req.moduleKey)) {
          addBlocker(createMissingRequiredDependencyIssue(currentKey, req.moduleKey, req.versionRange));
        } else {
          const depRecord = recordMap.get(req.moduleKey)!;
          if (!semver.satisfies(depRecord.version, req.versionRange)) {
            addBlocker(
              createRequiredVersionIncompatibleIssue(
                currentKey,
                req.moduleKey,
                req.versionRange,
                depRecord.version
              )
            );
          }
          if (!reachable.has(req.moduleKey)) {
            reachable.add(req.moduleKey);
            queue.push(req.moduleKey);
          }
        }
      }
    }

    // Sestavení podgrafu povinných závislostí pro dosažitelné moduly
    const reachableList = Array.from(reachable).sort((a, b) => a.localeCompare(b));
    const adj = new Map<string, string[]>();
    const requiredDepsMap = new Map<string, string[]>();

    for (const key of reachableList) {
      const rec = recordMap.get(key)!;
      const validReqs = rec.manifest.dependencies.required
        .filter((r) => reachable.has(r.moduleKey))
        .map((r) => r.moduleKey);
      adj.set(key, validReqs);
      requiredDepsMap.set(key, validReqs);
    }

    // Detekce cyklů v podgrafu
    const detectedCycles = detectCycles(reachableList, adj);
    for (const cycle of detectedCycles) {
      addBlocker(createDependencyCycleIssue(cycle));
    }

    // Diagnostika volitelných závislostí pro všechny moduly v uzávěru
    for (const key of reachableList) {
      const rec = recordMap.get(key)!;
      for (const opt of rec.manifest.dependencies.optional) {
        if (!recordMap.has(opt.moduleKey)) {
          addAdvisory(createOptionalDependencyMissingIssue(key, opt.moduleKey, opt.versionRange));
        } else {
          const optRecord = recordMap.get(opt.moduleKey)!;
          if (!semver.satisfies(optRecord.version, opt.versionRange)) {
            addAdvisory(
              createOptionalVersionIncompatibleIssue(
                key,
                opt.moduleKey,
                opt.versionRange,
                optRecord.version
              )
            );
          }
        }
      }
    }

    const sortedBlockers = sortIssues(blockers);
    const sortedAdvisories = sortIssues(advisories);
    const sortedCycles = sortCycles(detectedCycles);

    if (sortedBlockers.length > 0) {
      return {
        ok: false,
        resolvedOrder: [],
        blockers: sortedBlockers,
        advisories: sortedAdvisories,
        cycles: sortedCycles
      };
    }

    const order = topologicalSort(reachableList, requiredDepsMap);
    return {
      ok: true,
      resolvedOrder: order ?? [],
      blockers: [],
      advisories: sortedAdvisories,
      cycles: []
    };
  }

  /**
   * Analyzuje závislosti a sestaví globální pořadí pro všechny registrované moduly.
   * Jakákoli chyba v libovolném registrovaném modulu způsobí ok = false a resolvedOrder = [].
   */
  public resolveAll(): DependencyResolutionResult {
    const records = this.registry.listRecords();
    const recordMap = new Map<string, IModuleRegistryRecord>();
    for (const rec of records) {
      recordMap.set(rec.moduleKey, rec);
    }

    const allKeys = Array.from(recordMap.keys()).sort((a, b) => a.localeCompare(b));

    const blockers: DependencyIssue[] = [];
    const advisories: DependencyIssue[] = [];
    const seenBlockers = new Set<string>();
    const seenAdvisories = new Set<string>();

    function addBlocker(issue: DependencyIssue) {
      const sig = `${issue.code}:${issue.moduleKey}:${issue.dependencyKey ?? ""}:${issue.requiredRange ?? ""}:${issue.actualVersion ?? ""}:${(issue.cycle ?? []).join("->")}`;
      if (!seenBlockers.has(sig)) {
        seenBlockers.add(sig);
        blockers.push(issue);
      }
    }

    function addAdvisory(issue: DependencyIssue) {
      const sig = `${issue.code}:${issue.moduleKey}:${issue.dependencyKey ?? ""}:${issue.requiredRange ?? ""}:${issue.actualVersion ?? ""}`;
      if (!seenAdvisories.has(sig)) {
        seenAdvisories.add(sig);
        advisories.push(issue);
      }
    }

    const adj = new Map<string, string[]>();
    const requiredDepsMap = new Map<string, string[]>();

    for (const key of allKeys) {
      const rec = recordMap.get(key)!;
      const validReqs: string[] = [];

      for (const req of rec.manifest.dependencies.required) {
        if (!recordMap.has(req.moduleKey)) {
          addBlocker(createMissingRequiredDependencyIssue(key, req.moduleKey, req.versionRange));
        } else {
          const depRec = recordMap.get(req.moduleKey)!;
          if (!semver.satisfies(depRec.version, req.versionRange)) {
            addBlocker(
              createRequiredVersionIncompatibleIssue(
                key,
                req.moduleKey,
                req.versionRange,
                depRec.version
              )
            );
          }
          validReqs.push(req.moduleKey);
        }
      }

      adj.set(key, validReqs);
      requiredDepsMap.set(key, validReqs);

      for (const opt of rec.manifest.dependencies.optional) {
        if (!recordMap.has(opt.moduleKey)) {
          addAdvisory(createOptionalDependencyMissingIssue(key, opt.moduleKey, opt.versionRange));
        } else {
          const optRec = recordMap.get(opt.moduleKey)!;
          if (!semver.satisfies(optRec.version, opt.versionRange)) {
            addAdvisory(
              createOptionalVersionIncompatibleIssue(
                key,
                opt.moduleKey,
                opt.versionRange,
                optRec.version
              )
            );
          }
        }
      }
    }

    // Detekce cyklů v celém grafu
    const detectedCycles = detectCycles(allKeys, adj);
    for (const cycle of detectedCycles) {
      addBlocker(createDependencyCycleIssue(cycle));
    }

    const sortedBlockers = sortIssues(blockers);
    const sortedAdvisories = sortIssues(advisories);
    const sortedCycles = sortCycles(detectedCycles);

    if (sortedBlockers.length > 0) {
      return {
        ok: false,
        resolvedOrder: [],
        blockers: sortedBlockers,
        advisories: sortedAdvisories,
        cycles: sortedCycles
      };
    }

    const order = topologicalSort(allKeys, requiredDepsMap);
    return {
      ok: true,
      resolvedOrder: order ?? [],
      blockers: [],
      advisories: sortedAdvisories,
      cycles: []
    };
  }
}
