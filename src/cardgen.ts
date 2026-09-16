// Renders SYNTHETIC card-section images in the general visual grammar of an
// American mah jongg card (colored notation lines grouped under category
// headers, points column, (C) concealed marker). Used only to exercise the
// vision parser against known ground truth — no real card content.
import { Group, HandTemplate, SuitVar } from "./hands.js";

const SUIT_VAR_COLORS: Record<SuitVar, string> = {
  A: "#1d4ed8", // blue
  B: "#dc2626", // red
  C: "#15803d", // green
};
const NEUTRAL = "#111111";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Token {
  text: string;
  color: string;
}

function groupToken(g: Group): Token {
  const s = g.sym;
  let ch: string;
  let color = NEUTRAL;
  switch (s.t) {
    case "num":
      ch = String(s.n);
      color = SUIT_VAR_COLORS[s.suit];
      break;
    case "seq":
      ch = String(1 + s.offset); // runs printed from 1; "any run" semantics come from the category
      color = SUIT_VAR_COLORS[s.suit];
      break;
    case "flower":
      ch = "F";
      break;
    case "wind":
      ch = s.dir;
      break;
    case "dragon":
      ch = "D";
      color = SUIT_VAR_COLORS[s.suit];
      break;
    case "soap":
      ch = "0";
      break;
  }
  return { text: ch.repeat(g.count), color };
}

export function renderCardSVG(hands: HandTemplate[]): string {
  const byCategory = new Map<string, HandTemplate[]>();
  for (const h of hands) {
    const list = byCategory.get(h.category) ?? [];
    list.push(h);
    byCategory.set(h.category, list);
  }

  const width = 760;
  const lineH = 44;
  const headerH = 52;
  let y = 40;
  const parts: string[] = [];

  for (const [category, list] of byCategory) {
    parts.push(
      `<text x="40" y="${y}" font-size="22" font-weight="700" fill="#111" font-family="Helvetica" letter-spacing="1">${esc(category.toUpperCase())}</text>`,
    );
    y += headerH - 20;
    for (const h of list) {
      const tokens = h.groups.map(groupToken);
      let x = 60;
      const spans: string[] = [];
      for (const t of tokens) {
        spans.push(
          `<text x="${x}" y="${y}" font-size="26" font-weight="600" fill="${t.color}" font-family="Courier New" xml:space="preserve">${t.text}</text>`,
        );
        x += t.text.length * 16 + 18;
      }
      const marker = h.concealed ? "(C)" : "(X)";
      spans.push(
        `<text x="${width - 130}" y="${y}" font-size="20" fill="#111" font-family="Helvetica">${h.points} ${marker}</text>`,
      );
      parts.push(...spans);
      y += lineH;
    }
    y += 24;
  }

  const height = y + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fdfcf7"/>${parts.join("")}</svg>`;
}
