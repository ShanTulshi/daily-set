import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  type Card,
  type SetTriple,
  DECK_SIZE,
  assertValidPuzzle,
  cardToIndex,
  findSets,
  generatePuzzle,
  indexToCard,
  isSet,
  mulberry32,
  shufflePuzzle,
  thirdCard,
} from '../src/puzzle/index.ts'

const DECK = Array.from({ length: DECK_SIZE }, (_, i) => indexToCard(i))

function datesFrom(start: string, days: number): string[] {
  const d = new Date(`${start}T00:00:00Z`)
  return Array.from({ length: days }, (_, i) =>
    new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10),
  )
}

describe('cards', () => {
  test('index encoding round-trips', () => {
    for (let i = 0; i < DECK_SIZE; i++) assert.equal(cardToIndex(indexToCard(i)), i)
  })

  test('spec example is a Set', () => {
    assert.ok(isSet([0, 1, 2, 0], [1, 1, 0, 2], [2, 1, 1, 1]))
    assert.ok(!isSet([0, 1, 2, 0], [1, 1, 0, 2], [2, 1, 1, 2]))
  })

  test('any two distinct cards have a unique, distinct completing card', () => {
    for (const a of DECK) {
      for (const b of DECK) {
        if (cardToIndex(a) === cardToIndex(b)) continue
        const c = thirdCard(a, b)
        assert.ok(isSet(a, b, c))
        assert.notEqual(cardToIndex(c), cardToIndex(a))
        assert.notEqual(cardToIndex(c), cardToIndex(b))
        assert.equal(DECK.filter((x) => isSet(a, b, x)).length, 1)
      }
    }
  })

  test('the full deck has 1080 Sets', () => {
    assert.equal(findSets(DECK).length, (81 * 80) / 6)
  })
})

describe('generatePuzzle', () => {
  const dates = datesFrom('2026-01-01', 3 * 365)
  const puzzles = dates.map(generatePuzzle)

  test('every date yields exactly 4 disjoint Sets and no others', () => {
    for (const p of puzzles) {
      assertValidPuzzle(p)
      // Independent brute-force check over all 220 triples.
      let count = 0
      for (let i = 0; i < 12; i++)
        for (let j = i + 1; j < 12; j++)
          for (let k = j + 1; k < 12; k++) if (isSet(p.cards[i], p.cards[j], p.cards[k])) count++
      assert.equal(count, 4, p.date)
    }
  })

  test('is deterministic per date', () => {
    assert.deepEqual(generatePuzzle('2026-09-27'), generatePuzzle('2026-09-27'))
  })

  test('different dates give different puzzles', () => {
    const keys = new Set(puzzles.map((p) => p.cards.map(cardToIndex).join(',')))
    assert.equal(keys.size, puzzles.length)
  })

  test('rejects malformed dates', () => {
    assert.throws(() => generatePuzzle('9/27/2026'))
  })
})

describe('shufflePuzzle', () => {
  const puzzle = generatePuzzle('2026-09-27')

  test('keeps the same cards and remaps solutions correctly', () => {
    const shown = shufflePuzzle(puzzle)
    assertValidPuzzle(shown)
    assert.deepEqual(
      shown.cards.map(cardToIndex).sort((a, b) => a - b),
      puzzle.cards.map(cardToIndex),
    )
    const solutionCards = (p: typeof puzzle) =>
      p.solutionSets.map((s) => s.map((i) => cardToIndex(p.cards[i])).sort((a, b) => a - b).join()).sort()
    assert.deepEqual(solutionCards(shown), solutionCards(puzzle))
  })

  test('is reproducible from a seed', () => {
    assert.deepEqual(shufflePuzzle(puzzle, mulberry32(1)), shufflePuzzle(puzzle, mulberry32(1)))
    assert.notDeepEqual(shufflePuzzle(puzzle, mulberry32(1)).cards, shufflePuzzle(puzzle, mulberry32(2)).cards)
  })
})

describe('assertValidPuzzle', () => {
  const puzzle = generatePuzzle('2026-09-27')

  test('rejects 4 disjoint Sets that also contain accidental Sets', () => {
    // Lines {p, p+v, p+2v} with v = e₄ over base points p ∈ {0, e₁, 2e₁, e₂}.
    // The base points 0, e₁, 2e₁ are collinear, so 9 extra Sets cut across the lines.
    const bases: Card[] = [[0, 0, 0, 0], [1, 0, 0, 0], [2, 0, 0, 0], [0, 1, 0, 0]]
    const cards = bases.flatMap(([a, b, c]) => [0, 1, 2].map((d) => [a, b, c, d] as Card))
    const solutionSets: SetTriple[] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]]
    assert.equal(findSets(cards).length, 13)
    assert.throws(() => assertValidPuzzle({ date: 'test', cards, solutionSets }), /contain Sets/)
  })

  test('rejects wrong solution sets', () => {
    const [s0, s1, ...rest] = puzzle.solutionSets
    const swapped: SetTriple[] = [[s0[0], s0[1], s1[2]], [s1[0], s1[1], s0[2]], ...rest]
    assert.throws(() => assertValidPuzzle({ ...puzzle, solutionSets: swapped }), /not a Set/)
  })
})
