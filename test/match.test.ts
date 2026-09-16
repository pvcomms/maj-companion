import { describe, expect, it } from "vitest";
import { expand, handSize } from "../src/hands.js";
import { matchHand, rankHands } from "../src/match.js";
import { SAMPLE_HANDS } from "../src/samples.js";

const hand = (id: string) => {
  const h = SAMPLE_HANDS.find((h) => h.id === id);
  if (!h) throw new Error(`no sample hand ${id}`);
  return h;
};

describe("templates", () => {
  it("every sample hand totals 14 tiles", () => {
    for (const h of SAMPLE_HANDS) expect(handSize(h), h.id).toBe(14);
  });

  it("run with 2 suit vars and span 4 expands to 6 suit maps x 6 starts", () => {
    expect(expand(hand("sample-run-1"))).toHaveLength(36);
  });

  it("winds-only hand expands to exactly one target", () => {
    expect(expand(hand("sample-winds-1"))).toHaveLength(1);
  });
});

describe("matchHand", () => {
  it("one tile from complete reports distance 1 and the missing tile", () => {
    // evens: FF 2222D 4444D 66B 88B, missing one 8B
    const rack = [
      "F",
      "F",
      "2D",
      "2D",
      "2D",
      "2D",
      "4D",
      "4D",
      "4D",
      "4D",
      "6B",
      "6B",
      "8B",
    ];
    const m = matchHand(rack, hand("sample-evens-1"));
    expect(m.distance).toBe(1);
    expect(m.need).toEqual(["8B"]);
    expect(m.discard).toEqual([]);
  });

  it("a joker completes a kong but not a pair", () => {
    // same rack but the last 8B replaced by a joker: joker cannot sit in the
    // 88 pair... but it CAN sit in a kong, so give a rack missing a kong tile
    const kongGap = [
      "F",
      "F",
      "2D",
      "2D",
      "2D",
      "4D",
      "4D",
      "4D",
      "4D",
      "6B",
      "6B",
      "8B",
      "8B",
      "J",
    ];
    expect(matchHand(kongGap, hand("sample-evens-1")).distance).toBe(0);

    const pairGap = [
      "F",
      "F",
      "2D",
      "2D",
      "2D",
      "2D",
      "4D",
      "4D",
      "4D",
      "4D",
      "6B",
      "6B",
      "8B",
      "J",
    ];
    // joker cannot fill the 88 pair: still one tile short
    expect(matchHand(pairGap, hand("sample-evens-1")).distance).toBe(1);
    expect(matchHand(pairGap, hand("sample-evens-1")).need).toEqual(["8B"]);
  });

  it("jokers never fill singles/pairs hands at all", () => {
    const rack = [
      "F",
      "F",
      "1D",
      "1D",
      "3D",
      "3D",
      "5D",
      "5D",
      "7B",
      "7B",
      "9B",
      "J",
      "J",
    ];
    const m = matchHand(rack, hand("sample-pairs-1"));
    // 11 real tiles placed, jokers useless, 3 slots open (9B + NN)
    expect(m.distance).toBe(3);
    expect(m.need.sort()).toEqual(["9B", "N", "N"]);
  });

  it("quints lean on jokers", () => {
    const rack = [
      "1D",
      "1D",
      "1D",
      "1D",
      "2B",
      "2B",
      "2B",
      "2B",
      "N",
      "N",
      "N",
      "N",
      "J",
      "J",
    ];
    // two joker-filled quint slots -> complete
    expect(matchHand(rack, hand("sample-quints-1")).distance).toBe(0);
  });

  it("run hands pick the best suit assignment and start", () => {
    const rack = [
      "3C",
      "3C",
      "3C",
      "4C",
      "4C",
      "4C",
      "4C",
      "5B",
      "5B",
      "5B",
      "6B",
      "6B",
      "6B",
      "6B",
    ];
    const m = matchHand(rack, hand("sample-run-1"));
    expect(m.distance).toBe(0);
    expect(m.target.desc).toBe("3Cx3 4Cx4 5Bx3 6Bx4");
  });

  it("year hand consumes soap and duplicate singles", () => {
    const rack = [
      "F",
      "F",
      "F",
      "F",
      "2D",
      "0",
      "2D",
      "7D",
      "2B",
      "2B",
      "2B",
      "2C",
      "2C",
    ];
    const m = matchHand(rack, hand("sample-year-1"));
    expect(m.distance).toBe(1);
    expect(m.need).toEqual(["2C"]);
  });

  it("rankHands surfaces the nearest hand first", () => {
    const rack = [
      "F",
      "F",
      "2D",
      "2D",
      "2D",
      "2D",
      "4D",
      "4D",
      "4D",
      "6B",
      "6B",
      "8B",
      "8B",
    ];
    const ranked = rankHands(rack, SAMPLE_HANDS, 3);
    expect(ranked[0]!.hand.id).toBe("sample-evens-1");
    expect(ranked[0]!.distance).toBe(1);
  });
});
