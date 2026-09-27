import {
  type Card,
  DECK_SIZE,
  cardToIndex,
  findSets,
  indexToCard,
  isSet,
  thirdCard,
} from './card.ts'

export const CARDS_PER_PUZZLE = 12
export const SETS_PER_PUZZLE = 4

const MAX_ATTEMPTS = 10_000

/** Indices into `Puzzle.cards`, ascending. */
export type SetTriple = readonly [number, number, number]

export interface Puzzle {
  /** Calendar date as YYYY-MM-DD. */
  readonly date: string
  readonly cards: readonly Card[]
  /** The four disjoint Sets, referring to positions in `cards`. */
  readonly solutionSets: readonly SetTriple[]
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/** The local calendar date as YYYY-MM-DD. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Deterministically generates the puzzle for a date: 12 cards containing exactly
 * four pairwise-disjoint Sets and no others.
 *
 * Cards are returned in canonical order (ascending card index), so the puzzle's
 * identity doesn't depend on presentation; use `shufflePuzzle` for display order.
 */
export function generatePuzzle(date: string): Puzzle {
  if (!DATE_KEY.test(date)) throw new Error(`expected a YYYY-MM-DD date, got "${date}"`)

  const rng = mulberry32(dateSeed(date))
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const lines = randomDisjointLines(rng, SETS_PER_PUZZLE)
    const puzzle = fromLines(date, lines)
    // The planted lines are always present; accept only if nothing else is.
    if (findSets(puzzle.cards).length === SETS_PER_PUZZLE) {
      assertValidPuzzle(puzzle)
      return puzzle
    }
  }
  throw new Error(`no valid puzzle for ${date} after ${MAX_ATTEMPTS} attempts`)
}

/**
 * Picks `count` pairwise-disjoint affine lines (Sets) in Z₃⁴, as card indices.
 * Each line is two random unused cards plus the unique card completing them.
 *
 * Lines have independent directions, unlike the {p, p+v, p+2v} construction over a
 * plane P: that one confines all 12 cards to a 3-dimensional affine subspace, which
 * in ~10% of cases means every card shares one attribute (e.g. all red).
 */
function randomDisjointLines(rng: () => number, count: number): number[][] {
  const used = new Set<number>()
  const lines: number[][] = []
  while (lines.length < count) {
    const a = Math.floor(rng() * DECK_SIZE)
    const b = Math.floor(rng() * DECK_SIZE)
    if (a === b || used.has(a) || used.has(b)) continue
    const c = cardToIndex(thirdCard(indexToCard(a), indexToCard(b)))
    if (used.has(c)) continue
    lines.push([a, b, c])
    used.add(a).add(b).add(c)
  }
  return lines
}

function fromLines(date: string, lines: number[][]): Puzzle {
  const indices = lines.flat().sort((x, y) => x - y)
  const position = new Map(indices.map((index, i) => [index, i]))
  return {
    date,
    cards: indices.map(indexToCard),
    solutionSets: normalizeTriples(lines.map((line) => line.map((index) => position.get(index)!))),
  }
}

/** 2026-09-27 → 20260927 */
const dateSeed = (date: string) => Number(date.replaceAll('-', ''))

/** Seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Returns a copy of the puzzle with its cards permuted for display and
 * `solutionSets` remapped to the new positions. The underlying puzzle is unchanged.
 * Pass a seeded `random` (e.g. `mulberry32(seed)`) for a reproducible layout.
 */
export function shufflePuzzle(puzzle: Puzzle, random: () => number = Math.random): Puzzle {
  const order = puzzle.cards.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const newPosition = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]))
  return {
    date: puzzle.date,
    cards: order.map((i) => puzzle.cards[i]),
    solutionSets: normalizeTriples(
      puzzle.solutionSets.map((set) => set.map((i) => newPosition.get(i)!)),
    ),
  }
}

/**
 * Throws unless the puzzle has exactly 12 distinct cards whose only Sets are
 * `solutionSets`, and those four Sets partition the cards.
 */
export function assertValidPuzzle(puzzle: Puzzle): void {
  const { cards, solutionSets } = puzzle
  const fail = (reason: string): never => {
    throw new Error(`invalid puzzle for ${puzzle.date}: ${reason}`)
  }

  if (cards.length !== CARDS_PER_PUZZLE) fail(`expected ${CARDS_PER_PUZZLE} cards, got ${cards.length}`)
  if (new Set(cards.map(cardToIndex)).size !== cards.length) fail('cards are not distinct')
  if (solutionSets.length !== SETS_PER_PUZZLE) {
    fail(`expected ${SETS_PER_PUZZLE} solution sets, got ${solutionSets.length}`)
  }

  const covered = new Set<number>()
  for (const set of solutionSets) {
    for (const i of set) {
      if (!Number.isInteger(i) || i < 0 || i >= cards.length) fail(`bad card position ${i}`)
      if (covered.has(i)) fail(`card ${i} is in more than one solution set`)
      covered.add(i)
    }
    if (!isSet(cards[set[0]], cards[set[1]], cards[set[2]])) fail(`[${set.join(', ')}] is not a Set`)
  }

  const expected = normalizeTriples(solutionSets).map(String)
  const actual = findSets(cards).map(String)
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) {
    fail(`cards contain Sets ${JSON.stringify(actual)}, expected only ${JSON.stringify(expected)}`)
  }
}

/** Sorts each triple ascending, then the triples lexicographically. */
function normalizeTriples(triples: readonly (readonly number[])[]): SetTriple[] {
  return triples
    .map((t) => [...t].sort((x, y) => x - y) as unknown as SetTriple)
    .sort((s, t) => s[0] - t[0] || s[1] - t[1] || s[2] - t[2])
}
