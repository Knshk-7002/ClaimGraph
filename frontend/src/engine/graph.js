/**
 * Client-side ClaimGraph engine.
 * Reimplements the Python DAG algorithms for fully interactive, offline use.
 */

export function kahnTopologicalSort(claims, edges) {
  const depEdges = edges.filter(e => e.type === 'depends_on');
  const adj = {};
  const inDeg = {};
  for (const c of claims) {
    adj[c.id] = [];
    inDeg[c.id] = 0;
  }
  for (const e of depEdges) {
    if (adj[e.target] && inDeg[e.source] !== undefined) {
      adj[e.target].push(e.source);
      inDeg[e.source]++;
    }
  }
  const queue = claims.filter(c => inDeg[c.id] === 0).map(c => c.id);
  const order = [];
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of (adj[node] || [])) {
      inDeg[neighbor]--;
      if (inDeg[neighbor] === 0) queue.push(neighbor);
    }
  }
  return order;
}

export function wouldCreateCycle(claims, edges, newSource, newTarget) {
  const depEdges = [...edges.filter(e => e.type === 'depends_on'), { source: newSource, target: newTarget, type: 'depends_on' }];
  const adj = {};
  const inDeg = {};
  for (const c of claims) {
    adj[c.id] = [];
    inDeg[c.id] = 0;
  }
  for (const e of depEdges) {
    if (adj[e.target] && inDeg[e.source] !== undefined) {
      adj[e.target].push(e.source);
      inDeg[e.source]++;
    }
  }
  const queue = Object.keys(inDeg).filter(id => inDeg[id] === 0);
  let count = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    count++;
    for (const n of (adj[node] || [])) {
      inDeg[n]--;
      if (inDeg[n] === 0) queue.push(n);
    }
  }
  return count < claims.length;
}

export function computeConfidences(claims, evidence, edges, alpha = 0.7) {
  const topo = kahnTopologicalSort(claims, edges);
  const result = {};

  for (const claimId of topo) {
    const evs = evidence.filter(e => e.claim_id === claimId);
    let sum = 0;
    for (const ev of evs) {
      const sign = ev.direction === 'supports' ? 1 : -1;
      sum += sign * ev.strength * ev.source_quality;
    }
    const intrinsic = Math.tanh(sum);

    const prereqEdges = edges.filter(e => e.source === claimId && e.type === 'depends_on');
    const prereqIds = prereqEdges.map(e => e.target);
    let prereqsMean = null;
    let final_;

    if (prereqIds.length > 0) {
      const prereqConfs = prereqIds
        .filter(id => result[id] !== undefined)
        .map(id => result[id].final);
      if (prereqConfs.length > 0) {
        prereqsMean = prereqConfs.reduce((a, b) => a + b, 0) / prereqConfs.length;
        final_ = alpha * intrinsic + (1 - alpha) * prereqsMean;
      } else {
        final_ = intrinsic;
      }
    } else {
      final_ = intrinsic;
    }

    result[claimId] = { intrinsic, final: final_, prereqs_mean: prereqsMean };
  }
  return result;
}

export function computeLevels(claims, edges) {
  const topo = kahnTopologicalSort(claims, edges);
  const levels = {};
  for (const claimId of topo) {
    const prereqEdges = edges.filter(e => e.source === claimId && e.type === 'depends_on');
    if (prereqEdges.length === 0) {
      levels[claimId] = 0;
    } else {
      let maxLevel = 0;
      for (const e of prereqEdges) {
        if (levels[e.target] !== undefined) {
          maxLevel = Math.max(maxLevel, levels[e.target] + 1);
        }
      }
      levels[claimId] = maxLevel;
    }
  }
  return levels;
}

export function longestPathTo(claims, edges, targetId) {
  const topo = kahnTopologicalSort(claims, edges);
  const dist = {};
  const prev = {};
  for (const id of topo) {
    dist[id] = 0;
    prev[id] = null;
  }
  for (const id of topo) {
    const dependents = edges.filter(e => e.target === id && e.type === 'depends_on');
    for (const e of dependents) {
      if (dist[id] + 1 > dist[e.source]) {
        dist[e.source] = dist[id] + 1;
        prev[e.source] = id;
      }
    }
  }
  const path = [];
  let cur = targetId;
  while (cur !== null) {
    path.push(cur);
    cur = prev[cur];
  }
  return path;
}

export function allPathsTo(claims, edges, targetId) {
  const depEdges = edges.filter(e => e.type === 'depends_on');
  const prereqs = {};
  for (const c of claims) prereqs[c.id] = [];
  for (const e of depEdges) {
    if (prereqs[e.source]) prereqs[e.source].push(e.target);
  }

  const paths = [];
  function dfs(node, path) {
    if (prereqs[node].length === 0) {
      paths.push([...path]);
      return;
    }
    for (const p of prereqs[node]) {
      path.unshift(p);
      dfs(p, path);
      path.shift();
    }
  }
  dfs(targetId, [targetId]);
  return paths;
}

export function transitiveDependencies(claims, edges, claimId) {
  const depEdges = edges.filter(e => e.type === 'depends_on');
  const prereqs = {};
  for (const c of claims) prereqs[c.id] = [];
  for (const e of depEdges) {
    if (prereqs[e.source]) prereqs[e.source].push(e.target);
  }

  const visited = new Set();
  const queue = [...(prereqs[claimId] || [])];
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const p of (prereqs[node] || [])) {
      if (!visited.has(p)) queue.push(p);
    }
  }
  return [...visited].sort();
}
