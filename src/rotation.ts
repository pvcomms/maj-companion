// Event rotation scheduler: seat P players across tables of 4 for R rounds,
// minimizing repeat pairings (social-golfer style). Deterministic via seed.

export interface RoundSeating {
  round: number;
  tables: number[][]; // player indices per table
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pairIdx = (a: number, b: number, n: number) =>
  a < b ? a * n + b : b * n + a;

function tableCost(table: number[], pairCount: Uint16Array, n: number): number {
  let c = 0;
  for (let i = 0; i < table.length; i++)
    for (let j = i + 1; j < table.length; j++)
      c += pairCount[pairIdx(table[i]!, table[j]!, n)]!;
  return c;
}

export function scheduleRotation(
  players: number,
  perTable: number,
  rounds: number,
  seed = 1,
): RoundSeating[] {
  if (players % perTable !== 0)
    throw new Error(`${players} players not divisible by ${perTable}`);
  const nTables = players / perTable;
  const rng = mulberry32(seed);
  const pairCount = new Uint16Array(players * players);
  const out: RoundSeating[] = [];

  for (let r = 0; r < rounds; r++) {
    let best: number[][] | null = null;
    let bestCost = Infinity;

    for (let restart = 0; restart < 8 && bestCost > 0; restart++) {
      // random seating
      const order = Array.from({ length: players }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
      const tables: number[][] = Array.from({ length: nTables }, (_, t) =>
        order.slice(t * perTable, (t + 1) * perTable),
      );
      let cost = tables.reduce(
        (a, t) => a + tableCost(t, pairCount, players),
        0,
      );

      // hill-climb: swap players across tables when it lowers repeat pairings
      for (let iter = 0; iter < 30000 && cost > 0; iter++) {
        const t1 = Math.floor(rng() * nTables);
        let t2 = Math.floor(rng() * nTables);
        if (t1 === t2) t2 = (t2 + 1) % nTables;
        const i1 = Math.floor(rng() * perTable);
        const i2 = Math.floor(rng() * perTable);
        const before =
          tableCost(tables[t1]!, pairCount, players) +
          tableCost(tables[t2]!, pairCount, players);
        const a = tables[t1]![i1]!;
        tables[t1]![i1] = tables[t2]![i2]!;
        tables[t2]![i2] = a;
        const after =
          tableCost(tables[t1]!, pairCount, players) +
          tableCost(tables[t2]!, pairCount, players);
        if (after > before) {
          // revert
          const b = tables[t1]![i1]!;
          tables[t1]![i1] = a;
          tables[t2]![i2] = b;
        } else {
          cost += after - before;
        }
      }

      if (cost < bestCost) {
        bestCost = cost;
        best = tables.map((t) => [...t]);
      }
    }

    for (const table of best!)
      for (let i = 0; i < table.length; i++)
        for (let j = i + 1; j < table.length; j++)
          pairCount[pairIdx(table[i]!, table[j]!, players)]!++;

    out.push({ round: r + 1, tables: best! });
  }
  return out;
}

export function repeatPairings(
  rounds: RoundSeating[],
  players: number,
): number {
  const pairCount = new Uint16Array(players * players);
  let repeats = 0;
  for (const r of rounds)
    for (const table of r.tables)
      for (let i = 0; i < table.length; i++)
        for (let j = i + 1; j < table.length; j++) {
          const k = pairIdx(table[i]!, table[j]!, players);
          if (pairCount[k]! > 0) repeats++;
          pairCount[k]!++;
        }
  return repeats;
}
