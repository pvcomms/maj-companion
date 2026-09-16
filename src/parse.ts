// Card photo -> HandTemplate[] via vision model. The user photographs their
// own card (BYOC); this module never sources card content itself.
import Anthropic from "@anthropic-ai/sdk";
import { Group, HandTemplate } from "./hands.js";

const SCHEMA_PROMPT = `You are parsing a photo of an American mah jongg hand card section into structured JSON.

Reading rules:
- Each line is one hand: space-separated groups of repeated symbols, with a points value and (C) concealed / (X) exposed marker at the right.
- COLORS encode suits. Within one line, tokens printed in the same color belong to the same suit; different colors are different suits. Colors do NOT mean a fixed suit — assign suit variables "A", "B", "C" in order of first appearance in that line.
- Inspect the print color of EVERY token independently before assigning its suit variable; one line frequently alternates colors token by token, and singles are easy to misread. Two tokens share a variable only if their colors truly match.
- Black/neutral tokens are suit-independent: "F" = flower, "N"/"E"/"W"/"S" = winds.
- "D" printed in a color = the dragon matched to that color's suit variable.
- "0" = the soap (white dragon), suit-independent.
- Digits 1-9 in a color = number tiles in that suit variable.
- A group of k repeated symbols is a group of size k (1=single, 2=pair, 3=pung, 4=kong, 5=quint).
- If the category header is a CONSECUTIVE RUN (or similar "run" wording), the printed numbers are relative: convert them to {"t":"seq","offset":printed - lowest printed,"suit":...} so the run can start anywhere. Otherwise numbers are literal: {"t":"num","n":digit,"suit":...}.

Output STRICT JSON only — no prose, no markdown fences — an array of hands:
[{
  "name": string,            // the notation as printed, e.g. "FF 2222 4444 66 88"
  "category": string,        // section header as printed
  "points": number,
  "concealed": boolean,
  "groups": [{"count": number, "sym":
      {"t":"num","n":number,"suit":"A"|"B"|"C"}
    | {"t":"seq","offset":number,"suit":"A"|"B"|"C"}
    | {"t":"flower"}
    | {"t":"wind","dir":"N"|"E"|"W"|"S"}
    | {"t":"dragon","suit":"A"|"B"|"C"}
    | {"t":"soap"}}]
}]
Preserve group order left to right. Every hand must appear exactly once.`;

async function parseWithAnthropic(png: Buffer, model: string): Promise<string> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: png.toString("base64"),
            },
          },
          { type: "text", text: SCHEMA_PROMPT },
        ],
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text in response");
  return block.text;
}

async function parseWithGemini(png: Buffer, model: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "image/png",
                  data: png.toString("base64"),
                },
              },
              { text: SCHEMA_PROMPT },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");
  if (!text) throw new Error("no text in gemini response");
  return text;
}

export async function parseCardImage(
  png: Buffer,
  opts: { provider?: "anthropic" | "gemini"; model?: string } = {},
): Promise<HandTemplate[]> {
  const provider = opts.provider ?? "anthropic";
  const text =
    provider === "gemini"
      ? await parseWithGemini(png, opts.model ?? "gemini-2.5-flash")
      : await parseWithAnthropic(png, opts.model ?? "claude-fable-5");
  const raw = text
    .trim()
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "");
  const hands = JSON.parse(raw) as Array<
    Omit<HandTemplate, "id"> & { id?: string }
  >;
  return hands.map((h, i) => ({ ...h, id: h.id ?? `parsed-${i}` }));
}

// canonical group signature for comparing parsed output to ground truth
export function groupKey(g: Group): string {
  const s = g.sym;
  switch (s.t) {
    case "num":
      return `${g.count}xnum${s.n}${s.suit}`;
    case "seq":
      return `${g.count}xseq${s.offset}${s.suit}`;
    case "flower":
      return `${g.count}xF`;
    case "wind":
      return `${g.count}x${s.dir}`;
    case "dragon":
      return `${g.count}xD${s.suit}`;
    case "soap":
      return `${g.count}x0`;
  }
}

export function handKey(h: Pick<HandTemplate, "groups">): string {
  return h.groups.map(groupKey).join(" ");
}
