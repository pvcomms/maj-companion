import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { renderCardSVG } from "../src/cardgen.js";
import { SAMPLE_HANDS } from "../src/samples.js";

const out = process.argv[2] ?? "/tmp/maj-card-synth.png";
const svg = renderCardSVG(SAMPLE_HANDS);
const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
