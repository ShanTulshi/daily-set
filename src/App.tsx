import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import confetti from 'canvas-confetti'
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

function formatTime(elapsed: number): string {
  const ms = Math.floor(elapsed) // flooring keeps 59999.6 from rounding up to "0:60.000"
  const minutes = Math.floor(ms / 60_000)
  const seconds = ((ms % 60_000) / 1000).toFixed(3)
  return `${minutes}:${seconds.padStart(6, '0')}`
}

export default function App() {
  const [puzzle] = useState(() => shufflePuzzle(generatePuzzle(dateKey())))
  const [selected, setSelected] = useState<number[]>([])
  const [found, setFound] = useState<number[]>([]) // indices into puzzle.solutionSets
  const [misses, setMisses] = useState(0)
  const [solveTime, setSolveTime] = useState<number | null>(null) // ms, once solved
  const board = useRef<HTMLDivElement>(null)
  const startTime = useRef(0)

  useEffect(() => {
    startTime.current = performance.now()
  }, [])

  const foundCards = new Set(found.flatMap((s) => puzzle.solutionSets[s]))

  function toggle(i: number, event: MouseEvent<HTMLElement>) {
    if (selected.includes(i)) return setSelected(selected.filter((j) => j !== i))
    const next = [...selected, i]
    if (next.length < 3) return setSelected(next)

    setSelected([])
    // The puzzle's only Sets are its solutions, so matching one is the whole check.
    const match = puzzle.solutionSets.findIndex((set) => set.every((j) => next.includes(j)))
    if (match >= 0) {
      setFound([...found, match])
      if (found.length + 1 === puzzle.solutionSets.length) {
        // Event timestamps share performance.now()'s clock.
        setSolveTime(event.timeStamp - startTime.current)
        const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
        confetti({
          origin: {
            x: (left + width / 2) / window.innerWidth,
            y: (top + height / 2) / window.innerHeight,
          },
          disableForReducedMotion: true,
        })
      }
      return
    }
    setMisses(misses + 1)
    board.current?.animate(
      matchMedia('(prefers-reduced-motion: reduce)').matches
        ? [{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }]
        : [0, -8, 8, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
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
            onClick={(e) => toggle(i, e)}
          >
            <CardFace card={card} />
          </button>
        ))}
      </div>

      <p className="status" aria-live="polite">
        {solveTime === null ? (
          `${found.length} of ${puzzle.solutionSets.length} Sets found`
        ) : (
          <>
            <strong className="time">{formatTime(solveTime)}</strong>
            Solved with {misses} {misses === 1 ? 'miss' : 'misses'}!
          </>
        )}
      </p>
    </main>
  )
}
