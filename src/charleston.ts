import { HandTemplate } from "./hands.js";
import { HandMatch, rankHands } from "./match.js";
import { JOKER, TileCode } from "./tiles.js";

export interface PassSuggestion {
  pass: TileCode[];
  topHands: HandMatch[];
}

// Score each rack tile by how much it contributes to the nearest hands
// (closeness-weighted); pass the three lowest. Jokers may never be passed
// in the Charleston, so they are excluded outright.
export function suggestPass(
  rackTiles: TileCode[],
  hands: HandTemplate[],
  passCount = 3,
): PassSuggestion {
  const topHands = rankHands(rackTiles, hands, 8);

  interface Instance {
    tile: TileCode;
    ordinal: number; // 0-based among copies of the same tile in the rack
    score: number;
  }

  const seen = new Map<TileCode, number>();
  const instances: Instance[] = rackTiles.map((tile) => {
    const ordinal = seen.get(tile) ?? 0;
    seen.set(tile, ordinal + 1);
    return { tile, ordinal, score: 0 };
  });

  for (const m of topHands) {
    const weight = 1 / (1 + m.distance);
    const keepCounts = new Map<TileCode, number>();
    for (const t of m.keep) keepCounts.set(t, (keepCounts.get(t) ?? 0) + 1);
    for (const inst of instances) {
      if (inst.ordinal < (keepCounts.get(inst.tile) ?? 0)) {
        inst.score += weight;
      }
    }
  }

  const pass = instances
    .filter((i) => i.tile !== JOKER)
    .sort((a, b) => a.score - b.score)
    .slice(0, passCount)
    .map((i) => i.tile);

  return { pass, topHands };
}
