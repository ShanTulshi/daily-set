import { useRef, type CSSProperties } from 'react'
import { BUCKET_COUNT, bucketOf, formatTime, type History } from './results.ts'

const bucketLabel = (i: number) => (i === BUCKET_COUNT - 1 ? `${i * 10}+` : `${i * 10}–${i * 10 + 10}`)
const puzzles = (n: number) => `${n} ${n === 1 ? 'puzzle' : 'puzzles'}`

/** The Stats button and its dialog: a summary of past solves and a histogram of times. */
export default function Stats({ history, today }: { history: History; today: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const results = Object.values(history)
  const times = results.map((r) => r.time)
  const counts = Array.from({ length: BUCKET_COUNT }, () => 0)
  for (const time of times) counts[bucketOf(time)]++
  const max = Math.max(...counts)
  const todayBucket = history[today] ? bucketOf(history[today].time) : -1

  return (
    <>
      <button type="button" className="stats-button" onClick={() => dialog.current?.showModal()}>
        Stats
      </button>

      <dialog
        ref={dialog}
        className="stats"
        aria-labelledby="stats-title"
        // A click on the backdrop lands on the <dialog> itself, outside its content.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className="stats-content">
          <header>
            <h2 id="stats-title">Stats</h2>
            <form method="dialog">
              <button type="submit" className="close" aria-label="Close">
                ×
              </button>
            </form>
          </header>

          {results.length === 0 ? (
            <p className="empty">Solve a puzzle to start tracking your times.</p>
          ) : (
            <>
              <dl className="summary">
                <div>
                  <dt>Solved</dt>
                  <dd>{results.length}</dd>
                </div>
                <div>
                  <dt>Flawless</dt>
                  <dd>{results.filter((r) => r.misses === 0).length}</dd>
                </div>
                <div>
                  <dt>Best</dt>
                  <dd>{formatTime(Math.min(...times))}</dd>
                </div>
                <div>
                  <dt>Average</dt>
                  <dd>{formatTime(times.reduce((a, b) => a + b, 0) / times.length)}</dd>
                </div>
              </dl>

              <figure className="histogram">
                <figcaption>Solve times</figcaption>
                <div className="plot" data-max={max}>
                  {counts.map((n, i) => (
                    <div
                      key={i}
                      className="slot"
                      tabIndex={0}
                      aria-label={`${bucketLabel(i)} seconds: ${puzzles(n)}${i === todayBucket ? ', including today' : ''}`}
                      data-today={i === todayBucket || undefined}
                      style={{ '--h': n / max } as CSSProperties}
                    >
                      {i === todayBucket && <span className="cap">Today</span>}
                      <span className="bar" />
                      <span className="tip" aria-hidden="true">
                        <strong>{puzzles(n)}</strong> {bucketLabel(i)} s
                      </span>
                    </div>
                  ))}
                </div>
                <div className="x-labels" aria-hidden="true">
                  {counts.map((_, i) => (
                    <span key={i}>{i === BUCKET_COUNT - 1 ? '90+' : i * 10}</span>
                  ))}
                </div>
                <p className="x-title">Seconds</p>
              </figure>

              <details className="table-view">
                <summary>Show as table</summary>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Seconds</th>
                      <th scope="col">Puzzles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counts.map((n, i) => (
                      <tr key={i}>
                        <td>
                          {bucketLabel(i)}
                          {i === todayBucket && ' (today)'}
                        </td>
                        <td>{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
