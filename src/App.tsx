import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import confetti from 'canvas-confetti'
import {
  type Card,
  COLORS,
  NUMBERS,
  SHADINGS,
  SHAPES,
  cardToIndex,
  dateKey,
  generatePuzzle,
  mulberry32,
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

/** Today's progress. Only the latest date is kept, so old days don't accumulate. */
interface Progress {
  date: string
  layoutSeed: number // this player's card order
  startedAt: number // epoch ms
  found: number[] // cardToIndex of every card in a found Set
  misses: number
  solveTime: number | null // ms
}

const STORAGE_KEY = 'daily-set'

function loadProgress(date: string): Progress | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return saved?.date === date ? saved : null
  } catch {
    return null
  }
}

function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage unavailable (e.g. blocked): the game still works, it just isn't kept.
  }
}

function loadGame() {
  const date = dateKey()
  const saved = loadProgress(date)
  const layoutSeed = saved?.layoutSeed ?? Math.floor(Math.random() * 2 ** 32)
  return { saved, layoutSeed, puzzle: shufflePuzzle(generatePuzzle(date), mulberry32(layoutSeed)) }
}

export default function App() {
  const [{ saved, layoutSeed, puzzle }] = useState(loadGame)
  const [selected, setSelected] = useState<number[]>([])
  const [found, setFound] = useState(saved?.found ?? [])
  const [misses, setMisses] = useState(saved?.misses ?? 0)
  const [solveTime, setSolveTime] = useState(saved?.solveTime ?? null)
  const board = useRef<HTMLDivElement>(null)
  const startedAt = useRef(saved?.startedAt ?? 0)

  useEffect(() => {
    // The timer starts on the first render of the day's puzzle and survives reloads.
    startedAt.current ||= performance.timeOrigin + performance.now()
    saveProgress({
      date: puzzle.date,
      layoutSeed,
      startedAt: startedAt.current,
      found,
      misses,
      solveTime,
    })
  }, [puzzle.date, layoutSeed, found, misses, solveTime])

  const foundCards = new Set(found)

  function toggle(i: number, event: MouseEvent<HTMLElement>) {
    if (selected.includes(i)) return setSelected(selected.filter((j) => j !== i))
    const next = [...selected, i]
    if (next.length < 3) return setSelected(next)

    setSelected([])
    // The puzzle's only Sets are its solutions, so matching one is the whole check.
    const match = puzzle.solutionSets.findIndex((set) => set.every((j) => next.includes(j)))
    if (match >= 0) {
      setFound([...found, ...next.map((j) => cardToIndex(puzzle.cards[j]))])
      if (found.length + 3 === puzzle.cards.length) {
        // Event timestamps share performance.now()'s clock, offset from timeOrigin.
        setSolveTime(performance.timeOrigin + event.timeStamp - startedAt.current)
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
            disabled={foundCards.has(cardToIndex(card))}
            onClick={(e) => toggle(i, e)}
          >
            <CardFace card={card} />
          </button>
        ))}
      </div>

      <p className="status" aria-live="polite">
        {solveTime === null ? (
          `${found.length / 3} of ${puzzle.solutionSets.length} Sets found`
        ) : (
          <>
            <strong className="time">{formatTime(solveTime)}</strong>
            Solved with {misses} {misses === 1 ? 'miss' : 'misses'}!
          </>
        )}
      </p>

      <details className="help">
        <summary>Help</summary>
        <p>
          Every card has four features: number, shape, shading and color. Three cards form a
          Set when each feature is either the same on all three cards or different on all three.
        </p>
        <p>
          These 12 cards hold exactly four Sets, and each card belongs to exactly one of them.
          Tap three cards to guess a Set. Find all four to finish.
        </p>
        <p>
          <a href="https://en.wikipedia.org/wiki/Set_(card_game)" target="_blank" rel="noreferrer">
            Learn more about Set on Wikipedia
          </a>
        </p>
      </details>
    </main>
  )
}
