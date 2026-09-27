/**
 * A Set card as a vector in Z₃⁴. Components are, in order:
 * number, shape, shading, color — each 0, 1 or 2 (see the attribute tables below).
 */
export type Trit = 0 | 1 | 2
export type Card = readonly [number: Trit, shape: Trit, shading: Trit, color: Trit]

export const NUMBERS = [1, 2, 3] as const
export const SHAPES = ['oval', 'diamond', 'squiggle'] as const
export const SHADINGS = ['open', 'striped', 'solid'] as const
export const COLORS = ['red', 'green', 'purple'] as const

export const DIMENSIONS = 4
export const DECK_SIZE = 3 ** DIMENSIONS // 81

const mod3 = (n: number) => (((n % 3) + 3) % 3) as Trit

/** Encodes a card as a base-3 integer in [0, 81). */
export function cardToIndex(card: Card): number {
  return card[0] * 27 + card[1] * 9 + card[2] * 3 + card[3]
}

export function indexToCard(index: number): Card {
  if (!Number.isInteger(index) || index < 0 || index >= DECK_SIZE) {
    throw new RangeError(`card index out of range: ${index}`)
  }
  return [
    mod3(Math.floor(index / 27)),
    mod3(Math.floor(index / 9)),
    mod3(Math.floor(index / 3)),
    mod3(index),
  ]
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

/** Three cards form a Set iff a + b + c ≡ 0 (mod 3) in every coordinate. */
export function isSet(a: Card, b: Card, c: Card): boolean {
  for (let i = 0; i < DIMENSIONS; i++) {
    if ((a[i] + b[i] + c[i]) % 3 !== 0) return false
  }
  return true
}

/** The unique card c completing a Set with a and b: c = −a − b (mod 3). */
export function thirdCard(a: Card, b: Card): Card {
  return [
    mod3(-a[0] - b[0]),
    mod3(-a[1] - b[1]),
    mod3(-a[2] - b[2]),
    mod3(-a[3] - b[3]),
  ]
}

/** Every Set among `cards`, as ascending index triples into `cards`, in lexicographic order. */
export function findSets(cards: readonly Card[]): [number, number, number][] {
  const position = new Map<number, number>()
  cards.forEach((card, i) => position.set(cardToIndex(card), i))

  const sets: [number, number, number][] = []
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const k = position.get(cardToIndex(thirdCard(cards[i], cards[j])))
      // Each Set is found once per pair; only record it from its two lowest indices.
      if (k !== undefined && k > j) sets.push([i, j, k])
    }
  }
  return sets
}
