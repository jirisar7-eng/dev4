/**
 * @tmpr/module-engine - Dependency Graph Algorithms & Cycle Detection
 * Implementace detekce cyklů (Tarjan SCC + polynomiální shortest witness BFS) a deterministického topologického řazení (Kahn).
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
 * Poznámka k implementaci: Algoritmus je rekurzivní (strongConnect) se složitostí O(V + E)
 * před deterministickým řazením výstupů.
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
 * Pro danou silně souvislou komponentu (SCC) nalezne nejkratší witness cyklus.
 *
 * Algoritmus: Polynomiální shortest-witness BFS v O(V_scc + E_scc):
 * 1. Zvolí deterministický canonical start (lexikograficky nejmenší uzel SCC).
 * 2. Ošetří případný self-loop (start -> start => [start, start]).
 * 3. Sestaví reverzní adjacency list pouze pro uzly dané SCC.
 * 4. Spustí jeden BFS z canonical start na reverzním grafu, čímž získá nejkratší vzdálenost
 *    každého uzlu SCC zpět do canonical startu v původním grafu. Fronta obsahuje pouze
 *    jednotlivé uzly (O(V) paměť), necelé cesty (žádná exponenciální enumerace simple paths).
 * 5. Z odchozích sousedů canonical startu vybere souseda s minimální vzdáleností zpět do startu
 *    (s lexikografickým tie-breakem).
 * 6. Deterministicky zrekonstruuje witness po hranách s klesající vzdáleností (d - 1).
 */
function findCycleWitness(
  scc: readonly string[],
  adjacency: Map<string, readonly string[]>
): string[] {
  const sccSet = new Set(scc);
  const sortedNodes = [...scc].sort((a, b) => a.localeCompare(b));
  const start = sortedNodes[0]!;

  // 1. Ošetření self-loop na canonical startu
  const startOutgoing = (adjacency.get(start) ?? []).filter((n) => sccSet.has(n));
  if (startOutgoing.includes(start)) {
    return [start, start];
  }

  // 2. Sestavení reverzní adjacency pouze pro uzly uvnitř této SCC
  const reverseAdj = new Map<string, string[]>();
  for (const node of sortedNodes) {
    reverseAdj.set(node, []);
  }
  for (const u of sortedNodes) {
    const out = adjacency.get(u) ?? [];
    for (const v of out) {
      if (sccSet.has(v)) {
        reverseAdj.get(v)!.push(u);
      }
    }
  }
  for (const node of sortedNodes) {
    reverseAdj.get(node)!.sort((a, b) => a.localeCompare(b));
  }

  // 3. Jeden BFS z canonical startu na reverzním grafu
  const distToStart = new Map<string, number>();
  distToStart.set(start, 0);
  const bfsQueue: string[] = [start];

  while (bfsQueue.length > 0) {
    const curr = bfsQueue.shift()!;
    const d = distToStart.get(curr)!;
    const preds = reverseAdj.get(curr) ?? [];
    for (const pred of preds) {
      if (!distToStart.has(pred)) {
        distToStart.set(pred, d + 1);
        bfsQueue.push(pred);
      }
    }
  }

  // 4. Výběr nejlepšího odchozího souseda canonical startu
  let bestNeighbor: string | null = null;
  let minDistance = Infinity;
  const sortedStartNeighbors = [...startOutgoing].sort((a, b) => a.localeCompare(b));

  for (const neighbor of sortedStartNeighbors) {
    const dist = distToStart.get(neighbor);
    if (dist !== undefined) {
      if (dist < minDistance) {
        minDistance = dist;
        bestNeighbor = neighbor;
      }
    }
  }

  if (!bestNeighbor) {
    return canonicalizeCycle([...sortedNodes, sortedNodes[0]!]);
  }

  // 5. Deterministická rekonstrukce witness cyklu
  const witness: string[] = [start, bestNeighbor];
  let curr = bestNeighbor;

  while (curr !== start) {
    const currentDist = distToStart.get(curr)!;
    if (currentDist === 0) {
      break;
    }
    const targetDist = currentDist - 1;
    const outgoing = (adjacency.get(curr) ?? [])
      .filter((n) => sccSet.has(n))
      .filter((n) => distToStart.get(n) === targetDist)
      .sort((a, b) => a.localeCompare(b));

    if (outgoing.length === 0) {
      witness.push(start);
      break;
    }

    const nextNode = outgoing[0]!;
    witness.push(nextNode);
    curr = nextNode;
  }

  return canonicalizeCycle(witness);
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
