# maj-companion

This repository contains zero mah jongg hands. Not one. That constraint is the
design, and everything else follows from it.

American mah jongg is played off a card the National Mah Jongg League publishes
each year and defends. The card prints its hands in colour, and the colour _is_
the data: two tokens in the same colour are the same suit, but which suit is
never fixed, so a printed line is a template with free variables rather than a
concrete hand. Every companion app for this game hits the same wall — the engine
is useless without the card, and the card is not yours to redistribute.

So the card never enters the repo. The player photographs their own physical
copy, a vision model parses it into the hand DSL, and the parsed library stays
in that player's account. `src/samples.ts` holds eight invented hands in the
League's _style_ — category shapes, joker rules, points column — purely so the
tests and the parser evaluation have ground truth. Bring your own card. The
side effect is that every user must own a current one, which is the only version
of this product that leaves a licensing conversation open.

I verified that rather than trusting the comment at the top of the file. Across
the working tree and all three commits of history there are seventeen tracked
files, no images, no PDFs, no JSON, and no data file of any kind. The only
mentions of the League are prose about this policy and one line in `tiles.ts`
recording that soap pairs with dots, green with bams and red with craks — a rule
of the game, not content from the card.

## The hand DSL

A hand is a list of groups, each a count over a symbol. Symbols are literal
numbers, run offsets, winds, flowers, the soap, or a dragon bound to a suit
variable. Suit variables `A`/`B`/`C` are expanded **injectively**, so two
variables can never collapse onto the same suit — which is exactly what the card
means by printing two lines in two colours. A consecutive run from the samples:

```ts
{
  name: "111 2222 333 4444 (run, 2 suits)",
  groups: [pung(seq(0, "A")), kong(seq(1, "A")),
           pung(seq(2, "B")), kong(seq(3, "B"))],
}
```

`expand()` turns that into 36 concrete targets: six injective suit assignments
times six legal starting numbers, since a span of four offsets can begin
anywhere from 1 to 6. Eight templates produce 73 targets in total, and the
matcher scores a rack against every one of them.

## Exact greedy joker fill

Jokers substitute only in groups of three or more, never in a pair or a single.
`fillTarget` sorts the groups so the joker-ineligible ones claim real tiles
first, then lets jokers cover whatever the 3+ groups still need. That greedy
order is genuinely optimal, not a heuristic: contention for a tile only matters
when one claimant can use a joker and the other cannot, and serving the one that
cannot, first, is always at least as good. Two groups in the same eligibility
class can be served in any order without changing the total filled.

`pnpm test` runs 16 tests across three files — 10 on matching, 4 on the
scheduler, 2 on the Charleston advisor — and all 16 pass. `pnpm typecheck` is
clean.

## The scheduler, and where it stops working

My mother runs mah jongg groups, which is where the rotation scheduler came
from: 32 players, eight tables of four, seated so that nobody plays the same
opponent twice. It is a social-golfer problem solved by seeded restart plus
hill-climbing on a repeat-pairing cost.

The test asserts zero repeats over four rounds, which sounds stronger than it
is. I swept it further. Zero repeats hold through seven rounds; the eighth
produces 3, the ninth 12, the tenth 28. With 31 other players and three new
partners per round the combinatorial ceiling is ten rounds, so the hill-climber
reaches seven of a possible ten and then falls apart rather than degrading
gracefully. Four rounds is comfortably inside the easy regime and the test
proves less than it appears to.

## What this does not do

There is no app. This is a library and two scripts. The vision parser has never
seen a real card — I am waiting on photographs, so the entire BYOC premise is
unexercised on the thing it exists for. `scripts/eval-parser.ts` only ever runs
against `cardgen.ts`, which draws one font, flat colours, no glare, no
perspective and no fold, so a score against it tells you close to nothing about
a phone photo of a laminated card under kitchen lighting. It also needs an API
key and a network, so it is not in the suite. The Charleston advisor is an
unevaluated heuristic: nothing here measures whether its passes actually help.

The legal architecture is the part I would defend. The rest is an engine waiting
for a photograph.

## License

MIT.
