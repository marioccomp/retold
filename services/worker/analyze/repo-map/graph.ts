/**
 * File dependency graph and importance ranking.
 *
 * An edge A -> B means "A imports B". A file is important when many files
 * (directly or transitively) depend on it, which is what PageRank measures on
 * this graph: rank flows from importers to the files they import.
 */

export type DependencyGraph = {
  nodes: string[];
  /** importer -> imported files (deduplicated, no self-loops) */
  edges: Map<string, Set<string>>;
};

export function createGraph(nodes: Iterable<string>): DependencyGraph {
  const nodeList = [...new Set(nodes)];
  return { nodes: nodeList, edges: new Map(nodeList.map((n) => [n, new Set<string>()])) };
}

export function addEdge(graph: DependencyGraph, from: string, to: string) {
  if (from === to) return;
  const targets = graph.edges.get(from);
  if (!targets || !graph.edges.has(to)) return;
  targets.add(to);
}

export function countEdges(graph: DependencyGraph) {
  let total = 0;
  for (const targets of graph.edges.values()) total += targets.size;
  return total;
}

export function fanIn(graph: DependencyGraph) {
  const counts = new Map(graph.nodes.map((n) => [n, 0]));
  for (const targets of graph.edges.values()) {
    for (const target of targets) counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  return counts;
}

/**
 * PageRank (damping 0.85). Files that import nothing ("dangling") spread their
 * rank uniformly, as in the standard formulation. Scores sum to 1.
 */
export function pageRank(graph: DependencyGraph, iterations = 40, damping = 0.85) {
  const n = graph.nodes.length;
  if (n === 0) return new Map<string, number>();

  let rank = new Map(graph.nodes.map((node) => [node, 1 / n]));

  for (let iteration = 0; iteration < iterations; iteration++) {
    const next = new Map(graph.nodes.map((node) => [node, (1 - damping) / n]));
    let danglingRank = 0;

    for (const node of graph.nodes) {
      const targets = graph.edges.get(node)!;
      const nodeRank = rank.get(node)!;
      if (targets.size === 0) {
        danglingRank += nodeRank;
        continue;
      }
      const share = (damping * nodeRank) / targets.size;
      for (const target of targets) next.set(target, next.get(target)! + share);
    }

    const danglingShare = (damping * danglingRank) / n;
    for (const node of graph.nodes) next.set(node, next.get(node)! + danglingShare);
    rank = next;
  }

  return rank;
}
