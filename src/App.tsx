import { useRef, useState, type CSSProperties } from 'react'
import {
  type Card,
  COLORS,
  NUMBERS,
  SHADINGS,
  SHAPES,
  dateKey,
  generatePuzzle,
  shufflePuzzle,
} from './puzzle/index.ts'
import './App.css'

const images = import.meta.glob<string>('../static/set_cards_individual/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

function cardImage([number, shape, shading]: Card): string {
  return images[
    `../static/set_cards_individual/set_${SHAPES[shape]}_${SHADINGS[shading]}_${NUMBERS[number]}.svg`
  ]
}

function describe([number, shape, shading, color]: Card): string {
  const n = NUMBERS[number]
  return `${n} ${COLORS[color]} ${SHADINGS[shading]} ${SHAPES[shape]}${n > 1 ? 's' : ''}`
}

/**
 * The SVGs are black on white. A tint layer blended with `lighten` turns black into
 * the tint and leaves white alone; masking it with the same SVG keeps it inside the card.
 */
function CardFace({ card }: { card: Card }) {
  const src = cardImage(card)
  return (
    <span
      className="card-face"
      data-color={COLORS[card[3]]}
      style={{ '--src': `url("${src}")` } as CSSProperties}
    >
      <img src={src} alt={describe(card)} draggable={false} />
    </span>
  )
}

export default function App() {
  const [puzzle] = useState(() => shufflePuzzle(generatePuzzle(dateKey())))
  const [selected, setSelected] = useState<number[]>([])
  const [found, setFound] = useState<number[]>([]) // indices into puzzle.solutionSets
  const [misses, setMisses] = useState(0)
  const board = useRef<HTMLDivElement>(null)

  const foundCards = new Set(found.flatMap((s) => puzzle.solutionSets[s]))
  const solved = found.length === puzzle.solutionSets.length

  function toggle(i: number) {
    if (selected.includes(i)) return setSelected(selected.filter((j) => j !== i))
    const next = [...selected, i]
    if (next.length < 3) return setSelected(next)

    setSelected([])
    // The puzzle's only Sets are its solutions, so matching one is the whole check.
    const match = puzzle.solutionSets.findIndex((set) => set.every((j) => next.includes(j)))
    if (match >= 0) return setFound([...found, match])
    setMisses(misses + 1)
    board.current?.animate(
      [0, -8, 8, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 300 },
    )
  }

  return (
    <main>
      <header>
        <h1>Daily Set</h1>
        <p>{puzzle.date}</p>
      </header>

      <div className="board" ref={board}>
        {puzzle.cards.map((card, i) => (
          <button
            key={i}
            type="button"
            className="card"
            aria-pressed={selected.includes(i)}
            disabled={foundCards.has(i)}
            onClick={() => toggle(i)}
          >
            <CardFace card={card} />
          </button>
        ))}
      </div>

      <p className="status" aria-live="polite">
        {solved
          ? `Solved with ${misses} ${misses === 1 ? 'miss' : 'misses'}!`
          : `${found.length} of ${puzzle.solutionSets.length} Sets found`}
      </p>
    </main>
  )
}
