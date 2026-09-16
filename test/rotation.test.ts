import { describe, expect, it } from "vitest";
import { repeatPairings, scheduleRotation } from "../src/rotation.js";

describe("scheduleRotation", () => {
  it("seats 32 players at 8 tables of 4, every player exactly once per round", () => {
    const rounds = scheduleRotation(32, 4, 4, 7);
    expect(rounds).toHaveLength(4);
    for (const r of rounds) {
      expect(r.tables).toHaveLength(8);
      const seen = r.tables.flat().sort((a, b) => a - b);
      expect(seen).toEqual(Array.from({ length: 32 }, (_, i) => i));
    }
  });

  it("4 rounds of 32/4 produce zero repeat pairings", () => {
    const rounds = scheduleRotation(32, 4, 4, 7);
    expect(repeatPairings(rounds, 32)).toBe(0);
  });

  it("is deterministic for a given seed", () => {
    expect(scheduleRotation(32, 4, 3, 42)).toEqual(
      scheduleRotation(32, 4, 3, 42),
    );
  });

  it("rejects non-divisible headcounts", () => {
    expect(() => scheduleRotation(30, 4, 3)).toThrow();
  });
});
