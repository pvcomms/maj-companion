// Tile codes:
//   Numbers: '1D'..'9D' (dots), '1B'..'9B' (bams), '1C'..'9C' (craks)
//   Winds:   'N' 'E' 'W' 'S'
//   Dragons: 'R' (red), 'G' (green), '0' (soap/white — doubles as zero in year hands)
//   'F' flower (all flowers interchangeable in American), 'J' joker
export type Suit = "dot" | "bam" | "crak";
export type TileCode = string;

export const SUITS: Suit[] = ["dot", "bam", "crak"];
export const SUIT_LETTER: Record<Suit, string> = {
  dot: "D",
  bam: "B",
  crak: "C",
};

// NMJL suit-dragon pairing: soap goes with dots, green with bams, red with craks
export const DRAGON_FOR_SUIT: Record<Suit, TileCode> = {
  dot: "0",
  bam: "G",
  crak: "R",
};

export const JOKER: TileCode = "J";
export const FLOWER: TileCode = "F";

export function numTile(n: number, suit: Suit): TileCode {
  return `${n}${SUIT_LETTER[suit]}`;
}

export type Multiset = Map<TileCode, number>;

export function toMultiset(tiles: TileCode[]): Multiset {
  const m: Multiset = new Map();
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

export function fromMultiset(m: Multiset): TileCode[] {
  const out: TileCode[] = [];
  for (const [t, c] of m) for (let i = 0; i < c; i++) out.push(t);
  return out;
}
