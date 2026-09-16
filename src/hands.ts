import {
  DRAGON_FOR_SUIT,
  FLOWER,
  SUIT_LETTER,
  SUITS,
  Suit,
  TileCode,
  numTile,
} from "./tiles.js";

export type SuitVar = "A" | "B" | "C";

export type Sym =
  | { t: "num"; n: number; suit: SuitVar }
  | { t: "seq"; offset: number; suit: SuitVar } // resolves to (n + offset) where n is bound per expansion
  | { t: "flower" }
  | { t: "wind"; dir: "N" | "E" | "W" | "S" }
  | { t: "dragon"; suit: SuitVar } // the dragon paired with whatever suit the var resolves to
  | { t: "soap" }; // white dragon used as zero (year hands)

// Jokers may substitute in any group of 3+ identical tiles; never in pairs or singles.
export interface Group {
  count: number; // 1..5
  sym: Sym;
}

export interface HandTemplate {
  id: string;
  name: string; // display notation, e.g. "FF 2222 4444 66 88"
  category: string;
  points: number;
  concealed: boolean;
  groups: Group[];
}

export interface ConcreteGroup {
  tile: TileCode;
  count: number;
  jokerOk: boolean;
}

export interface ConcreteTarget {
  hand: HandTemplate;
  groups: ConcreteGroup[];
  desc: string; // resolved notation, e.g. "FF 2222D 4444B 66C 88C"
}

function usedSuitVars(groups: Group[]): SuitVar[] {
  const vars = new Set<SuitVar>();
  for (const g of groups) {
    const s = g.sym;
    if (s.t === "num" || s.t === "seq" || s.t === "dragon") vars.add(s.suit);
  }
  return [...vars].sort() as SuitVar[];
}

function injectiveAssignments(vars: SuitVar[]): Array<Record<SuitVar, Suit>> {
  if (vars.length === 0) return [{} as Record<SuitVar, Suit>];
  const out: Array<Record<SuitVar, Suit>> = [];
  const pick = (
    i: number,
    taken: Set<Suit>,
    acc: Partial<Record<SuitVar, Suit>>,
  ) => {
    if (i === vars.length) {
      out.push({ ...acc } as Record<SuitVar, Suit>);
      return;
    }
    for (const s of SUITS) {
      if (taken.has(s)) continue;
      taken.add(s);
      acc[vars[i]!] = s;
      pick(i + 1, taken, acc);
      taken.delete(s);
    }
  };
  pick(0, new Set(), {});
  return out;
}

function resolveSym(
  sym: Sym,
  suits: Record<SuitVar, Suit>,
  n: number,
): TileCode {
  switch (sym.t) {
    case "num":
      return numTile(sym.n, suits[sym.suit]);
    case "seq":
      return numTile(n + sym.offset, suits[sym.suit]);
    case "flower":
      return FLOWER;
    case "wind":
      return sym.dir;
    case "dragon":
      return DRAGON_FOR_SUIT[suits[sym.suit]];
    case "soap":
      return "0";
  }
}

function describe(groups: ConcreteGroup[]): string {
  return groups
    .map((g) => (g.count > 1 ? `${g.tile}x${g.count}` : g.tile))
    .join(" ");
}

export function expand(hand: HandTemplate): ConcreteTarget[] {
  const vars = usedSuitVars(hand.groups);
  const assignments = injectiveAssignments(vars);
  const maxOffset = Math.max(
    0,
    ...hand.groups.flatMap((g) => (g.sym.t === "seq" ? [g.sym.offset] : [])),
  );
  const hasSeq = hand.groups.some((g) => g.sym.t === "seq");
  const nStarts = hasSeq
    ? Array.from({ length: 9 - maxOffset }, (_, i) => i + 1)
    : [0];

  const targets: ConcreteTarget[] = [];
  for (const suits of assignments) {
    for (const n of nStarts) {
      const groups: ConcreteGroup[] = hand.groups.map((g) => ({
        tile: resolveSym(g.sym, suits, n),
        count: g.count,
        jokerOk: g.count >= 3,
      }));
      targets.push({ hand, groups, desc: describe(groups) });
    }
  }
  return targets;
}

// --- authoring helpers ---
const single = (sym: Sym): Group => ({ count: 1, sym });
const mk =
  (count: number) =>
  (sym: Sym): Group => ({ count, sym });
export const pair = mk(2);
export const pung = mk(3);
export const kong = mk(4);
export const quint = mk(5);
export const one = single;

export const num = (n: number, suit: SuitVar): Sym => ({ t: "num", n, suit });
export const seq = (offset: number, suit: SuitVar): Sym => ({
  t: "seq",
  offset,
  suit,
});
export const flower: Sym = { t: "flower" };
export const wind = (dir: "N" | "E" | "W" | "S"): Sym => ({ t: "wind", dir });
export const dragon = (suit: SuitVar): Sym => ({ t: "dragon", suit });
export const soap: Sym = { t: "soap" };

export function handSize(hand: HandTemplate): number {
  return hand.groups.reduce((a, g) => a + g.count, 0);
}
