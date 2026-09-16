// Renders a synthetic card page from SAMPLE_HANDS, runs the vision parser on
// it, and scores template-exact accuracy against ground truth.
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { renderCardSVG } from "../src/cardgen.js";
import { handKey, parseCardImage } from "../src/parse.js";
import { SAMPLE_HANDS } from "../src/samples.js";

const OUT = process.env.CARD_PNG_PATH ?? "/tmp/maj-card-synth.png";

async function main() {
  const svg = renderCardSVG(SAMPLE_HANDS);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(OUT, png);
  console.log(`synthetic card written: ${OUT}`);

  const provider = (process.env.PARSE_PROVIDER ?? "anthropic") as
    "anthropic" | "gemini";
  const parsed = await parseCardImage(png, {
    provider,
    model: process.env.PARSE_MODEL,
  });
  writeFileSync(
    OUT.replace(/\.png$/, ".parsed.json"),
    JSON.stringify(parsed, null, 2),
  );
  console.log(
    `parsed ${parsed.length} hands (expected ${SAMPLE_HANDS.length})\n`,
  );

  let pass = 0;
  for (const truth of SAMPLE_HANDS) {
    const want = handKey(truth);
    const hit = parsed.find((p) => handKey(p) === want);
    const meta =
      hit && hit.points === truth.points && hit.concealed === truth.concealed;
    if (hit && meta) {
      pass++;
      console.log(`PASS  ${truth.id}`);
    } else if (hit) {
      console.log(
        `META  ${truth.id} groups ok, points/concealed off (${hit.points}/${hit.concealed})`,
      );
    } else {
      console.log(`FAIL  ${truth.id}`);
      console.log(`      want ${want}`);
      const near = parsed.find((p) => p.category === truth.category);
      if (near) console.log(`      got  ${handKey(near)}`);
    }
  }
  console.log(`\ntemplate-exact: ${pass}/${SAMPLE_HANDS.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
