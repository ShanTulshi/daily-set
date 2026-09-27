# Daily Set

A daily puzzle based on the card game [Set](https://en.wikipedia.org/wiki/Set_(card_game)), live at **[set.shan.wtf](https://set.shan.wtf)**.

Every day has one puzzle: 12 cards that contain exactly four Sets, with no card shared between them and no other Sets hiding among the cards. Find all four. Your time and wrong guesses are shown when you finish.

New to Set? [Wikipedia](https://en.wikipedia.org/wiki/Set_(card_game)) explains the game and its rules.

## How it works

Each card is a vector in Z₃⁴: number, shape, shading and color, each 0, 1 or 2. Three cards form a Set when every coordinate sums to 0 mod 3, i.e. each attribute is all the same or all different. Any two cards have exactly one card that completes a Set with them: `c = −a − b (mod 3)`.

The generator (`src/puzzle/`) is plain TypeScript with no UI dependencies:

1. Seed a PRNG from the date (`2026-09-27` → `20260927`), so every player gets the same puzzle.
2. Pick four disjoint Sets at random: two unused cards plus the card that completes them.
3. Find every Set among the 12 cards by completing each pair. Keep the candidate only if the four chosen Sets are the only ones, otherwise try again (about 1 in 5 candidates passes; generation takes well under a millisecond).
4. Check the result against the full invariant (`assertValidPuzzle`) before returning it.

The puzzle itself is fixed per date. The on-screen card order is shuffled separately from a per-player seed, so layouts differ between players but stay the same across reloads.

Progress (found Sets, misses, start and solve time, layout seed) is kept in `localStorage` for the current day only. That stops casual retries, but it isn't tamper-proof.

> Changing the generator changes the puzzle for every date, past and future.

## Development

```bash
npm install
npm run dev     # dev server at http://localhost:5173
npm test        # generator tests (Node's built-in test runner)
npm run lint
npm run build   # type-check and build to dist/
```

| Path | Contents |
|---|---|
| `src/puzzle/card.ts` | Card representation, Set check, Set completion, `findSets` |
| `src/puzzle/puzzle.ts` | Daily generator, validation, display shuffle, PRNG |
| `src/App.tsx` | Game UI, timer, saved progress |
| `static/set_cards_individual/` | Black-and-white card SVGs, tinted by color in CSS |
| `scripts/draw-cards.ts` | Draws those SVGs: `node scripts/draw-cards.ts` |
| `tests/` | Generator tests |

## Deployment

Every push to `main` runs lint, tests and the build, then deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`). The custom domain `set.shan.wtf` is set in the repo's Pages settings and proxied through Cloudflare, which handles HTTPS.
