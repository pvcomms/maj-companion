import {
  ConcreteGroup,
  ConcreteTarget,
  HandTemplate,
  expand,
  handSize,
} from "./hands.js";
import { JOKER, Multiset, TileCode, toMultiset } from "./tiles.js";

export interface HandMatch {
  hand: HandTemplate;
  target: ConcreteTarget;
  distance: number; // tiles still missing toward the full 14
  need: TileCode[]; // concrete tiles that would fill the gap (jokers also work for 3+ groups)
  keep: TileCode[]; // rack tiles this line uses (jokers included)
  discard: TileCode[]; // rack tiles this line doesn't use
}

interface Fill {
  filled: number;
  jokersUsed: number;
  need: TileCode[];
  keepCounts: Multiset;
}

// Greedy fill: joker-ineligible groups (singles/pairs) claim real tiles first,
// then jokers cover remaining slots in 3+ groups. Contention between two groups
// wanting the same tile only occurs across eligibility classes, so this is exact
// for every hand shape on a real card.
function fillTarget(rack: Multiset, groups: ConcreteGroup[]): Fill {
  const avail = new Map(rack);
  const jokers = avail.get(JOKER) ?? 0;
  avail.delete(JOKER);

  const ordered = [...groups].sort(
    (a, b) => Number(a.jokerOk) - Number(b.jokerOk),
  );

  let filled = 0;
  let jokerSlots = 0;
  const need: TileCode[] = [];
  const keepCounts: Multiset = new Map();

  for (const g of ordered) {
    const have = avail.get(g.tile) ?? 0;
    const take = Math.min(have, g.count);
    if (take > 0) {
      avail.set(g.tile, have - take);
      keepCounts.set(g.tile, (keepCounts.get(g.tile) ?? 0) + take);
      filled += take;
    }
    const missing = g.count - take;
    if (missing > 0) {
      if (g.jokerOk) jokerSlots += missing;
      for (let i = 0; i < missing; i++) need.push(g.tile);
    }
  }

  const jokersUsed = Math.min(jokers, jokerSlots);
  if (jokersUsed > 0) keepCounts.set(JOKER, jokersUsed);
  return { filled: filled + jokersUsed, jokersUsed, need, keepCounts };
}

export function matchHand(
  rackTiles: TileCode[],
  hand: HandTemplate,
): HandMatch {
  const rack = toMultiset(rackTiles);
  const size = handSize(hand);
  let best: HandMatch | null = null;

  for (const target of expand(hand)) {
    const fill = fillTarget(rack, target.groups);
    const distance = size - fill.filled;
    if (best && distance >= best.distance) continue;

    // need list still includes slots a held joker will cover — trim from the
    // joker-eligible end so `need` reflects tiles genuinely missing
    const need = [...fill.need];
    let toTrim = fill.jokersUsed;
    for (let i = need.length - 1; i >= 0 && toTrim > 0; i--) {
      const tile = need[i]!;
      const grp = target.groups.find((g) => g.tile === tile && g.jokerOk);
      if (grp) {
        need.splice(i, 1);
        toTrim--;
      }
    }

    const keep: TileCode[] = [];
    const discard: TileCode[] = [];
    for (const [tile, count] of rack) {
      const kept = fill.keepCounts.get(tile) ?? 0;
      for (let i = 0; i < Math.min(kept, count); i++) keep.push(tile);
      for (let i = 0; i < count - kept; i++) discard.push(tile);
    }

    best = { hand, target, distance, need, keep, discard };
  }

  return best!;
}

export function rankHands(
  rackTiles: TileCode[],
  hands: HandTemplate[],
  topN = 5,
): HandMatch[] {
  return hands
    .map((h) => matchHand(rackTiles, h))
    .sort((a, b) => a.distance - b.distance || b.hand.points - a.hand.points)
    .slice(0, topN);
}
