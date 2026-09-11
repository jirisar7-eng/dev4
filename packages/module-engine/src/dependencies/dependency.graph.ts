/**
 * @tmpr/module-engine - Dependency Graph Algorithms & Cycle Detection
 * Implementace detekce cyklů (Tarjan SCC + shortest witness BFS) a deterministického topologického řazení (Kahn).
 */

/**
 * Normalizuje cyklus tak, aby začínal a končil na lexikograficky nejmenším uzlu.
 * Například: [B, C, A, B] -> [A, B, C, A]
 * Zabraňuje duplicitnímu reportování téhož cyklu z různých výchozích bodů.
 */
export function canonicalizeCycle(cycle: readonly string[]): string[] {
  if (cycle.length <= 1) {
    return [...cycle];
  }
  const nodes = cycle.slice(0, -1);
  let minIndex = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i]!.localeCompare(nodes[minIndex]!) < 0) {
      minIndex = i;
    }
  }
  const canonicalNodes = [
    ...nodes.slice(minIndex),
    ...nodes.slice(0, minIndex)
  ];
  return [...canonicalNodes, canonicalNodes[0]!];
}

interface TarjanState {
  index: number;
  indices: Map<string, number>;
  lowlinks: Map<string, number>;
  onStack: Set<string>;
  stack: string[];
  sccs: string[][];
}

/**
 * Spustí Tarjanův SCC algoritmus na orientovaném grafu.
 */
function computeSCCs(
  vertices: readonly string[],
  adjacency: Map<string, readonly string[]>
): string[][] {
  const state: TarjanState = {
    index: 0,
    indices: new Map(),
    lowlinks: new Map(),
    onStack: new Set(),
    stack: [],
    sccs: []
  };

  const sortedVertices = [...vertices].sort((a, b) => a.localeCompare(b));

  function strongConnect(v: string) {
    state.indices.set(v, state.index);
    state.lowlinks.set(v, state.index);
    state.index++;
    state.stack.push(v);
    state.onStack.add(v);

    const neighbors = (adjacency.get(v) ?? []).slice().sort((a, b) => a.localeCompare(b));
    for (const w of neighbors) {
      if (!state.indices.has(w)) {
        strongConnect(w);
        state.lowlinks.set(v, Math.min(state.lowlinks.get(v)!, state.lowlinks.get(w)!));
      } else if (state.onStack.has(w)) {
        state.lowlinks.set(v, Math.min(state.lowlinks.get(v)!, state.indices.get(w)!));
      }
    }

    if (state.lowlinks.get(v) === state.indices.get(v)) {
      const scc: string[] = [];
      while (true) {
        const w = state.stack.pop()!;
        state.onStack.delete(w);
        scc.push(w);
        if (w === v) break;
      }
      state.sccs.push(scc);
    }
  }

  for (const v of sortedVertices) {
    if (!state.indices.has(v)) {
      strongConnect(v);
    }
  }

  return state.sccs;
}

/**
 * Pro danou silně souvislou komponentu (SCC) nalezne nejkratší witness cyklus pomocí BFS od minNode.
 */
function findCycleWitness(
  scc: readonly string[],
  adjacency: Map<string, readonly string[]>
): string[] {
  const sccSet = new Set(scc);
  const sortedNodes = [...scc].sort((a, b) => a.localeCompare(b));
  const minNode = sortedNodes[0]!;

  const queue: string[][] = [];
  const neighbors = (adjacency.get(minNode) ?? [])
    .filter((n) => sccSet.has(n))
    .sort((a, b) => a.localeCompare(b));

  for (const next of neighbors) {
    if (next === minNode) {
      return [minNode, minNode];
    }
    queue.push([minNode, next]);
  }

  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1]!;
    const nextNeighbors = (adjacency.get(last) ?? [])
      .filter((n) => sccSet.has(n))
      .sort((a, b) => a.localeCompare(b));

    for (const next of nextNeighbors) {
      if (next === minNode) {
        return canonicalizeCycle([...path, minNode]);
      }
      if (!path.includes(next)) {
        queue.push([...path, next]);
      }
    }
  }

  return canonicalizeCycle([...sortedNodes, sortedNodes[0]!]);
}

/**
 * Detekuje všechny oddělené cykly v orientovaném grafu.
 * Vrací pole kanonických witness cyklů seřazených deterministicky.
 */
export function detectCycles(
  vertices: readonly string[],
  adjacency: Map<string, readonly string[]>
): string[][] {
  const sccs = computeSCCs(vertices, adjacency);
  const cycleSignatures = new Set<string>();
  const cycles: string[][] = [];

  for (const scc of sccs) {
    let isCyclic = false;
    if (scc.length > 1) {
      isCyclic = true;
    } else if (scc.length === 1) {
      const single = scc[0]!;
      const neighbors = adjacency.get(single) ?? [];
      if (neighbors.includes(single)) {
        isCyclic = true;
      }
    }

    if (isCyclic) {
      const witness = findCycleWitness(scc, adjacency);
      const sig = witness.join("->");
      if (!cycleSignatures.has(sig)) {
        cycleSignatures.add(sig);
        cycles.push(witness);
      }
    }
  }

  cycles.sort((a, b) => a.join("->").localeCompare(b.join("->")));
  return cycles;
}

/**
 * Deterministické topologické seřazení (Kahnův algoritmus).
 * Závislosti se řadí PŘED závislé moduly (např. [C, B, A] kde A requires B, B requires C).
 * Pokud existuje více nezávislých kandidátů se stejnou prioritou, použije se lexikografické řazení.
 */
export function topologicalSort(
  vertices: readonly string[],
  requiredDeps: Map<string, readonly string[]>
): string[] | null {
  const unresolvedCounts = new Map<string, number>();
  const dependentsOf = new Map<string, string[]>();

  for (const v of vertices) {
    unresolvedCounts.set(v, 0);
    dependentsOf.set(v, []);
  }

  for (const v of vertices) {
    const deps = requiredDeps.get(v) ?? [];
    for (const d of deps) {
      if (unresolvedCounts.has(d)) {
        unresolvedCounts.set(v, unresolvedCounts.get(v)! + 1);
        dependentsOf.get(d)!.push(v);
      }
    }
  }

  const available: string[] = [];
  for (const [v, count] of unresolvedCounts.entries()) {
    if (count === 0) {
      available.push(v);
    }
  }
  available.sort((a, b) => a.localeCompare(b));

  const order: string[] = [];
  while (available.length > 0) {
    const curr = available.shift()!;
    order.push(curr);

    const dependents = dependentsOf.get(curr) ?? [];
    for (const dep of dependents) {
      const newCount = unresolvedCounts.get(dep)! - 1;
      unresolvedCounts.set(dep, newCount);
      if (newCount === 0) {
        available.push(dep);
        available.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  if (order.length !== vertices.length) {
    return null;
  }
  return order;
}
