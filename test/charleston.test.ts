import { describe, expect, it } from "vitest";
import { suggestPass } from "../src/charleston.js";
import { SAMPLE_HANDS } from "../src/samples.js";

describe("suggestPass", () => {
  it("never passes jokers", () => {
    const rack = [
      "J",
      "J",
      "J",
      "2D",
      "2D",
      "4D",
      "4D",
      "6B",
      "8B",
      "N",
      "E",
      "W",
      "S",
    ];
    const { pass } = suggestPass(rack, SAMPLE_HANDS);
    expect(pass).toHaveLength(3);
    expect(pass).not.toContain("J");
  });

  it("passes tiles that contribute to nothing over tiles near a hand", () => {
    // strong evens skeleton + three orphan winds/craks
    const rack = [
      "F",
      "F",
      "2D",
      "2D",
      "2D",
      "4D",
      "4D",
      "4D",
      "6B",
      "6B",
      "8B",
      "E",
      "W",
    ];
    const { pass } = suggestPass(rack, SAMPLE_HANDS);
    expect(pass).toContain("E");
    expect(pass).toContain("W");
    // core evens tiles stay put
    expect(pass).not.toContain("2D");
    expect(pass).not.toContain("4D");
    expect(pass).not.toContain("F");
  });
});
