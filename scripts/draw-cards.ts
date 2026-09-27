// Draws the 27 black-and-white card SVGs (colour is applied in CSS).
// Run: node scripts/draw-cards.ts
import { writeFileSync } from 'node:fs'
import { NUMBERS, SHADINGS, SHAPES } from '../src/puzzle/card.ts'

const OUT = new URL('../static/set_cards_individual/', import.meta.url)
const W = 130
const H = 150
const HALF_W = 15 // each shape is 30 × 72, standing upright
const HALF_H = 36
const SPACING = 40 // centre to centre
const STROKE = 3.5

const f = (n: number) => +n.toFixed(2)

const pill = (cx: number, cy: number) => {
  const r = HALF_W
  const top = cy - HALF_H + r
  const bottom = cy + HALF_H - r
  return `M ${cx - r} ${top} A ${r} ${r} 0 0 1 ${cx + r} ${top} L ${cx + r} ${bottom} A ${r} ${r} 0 0 1 ${cx - r} ${bottom} Z`
}

const diamond = (cx: number, cy: number) =>
  `M ${cx} ${cy - HALF_H} L ${cx + HALF_W} ${cy} L ${cx} ${cy + HALF_H} L ${cx - HALF_W} ${cy} Z`

/**
 * The classic Set squiggle, standing upright. Anchor points trace one long edge and
 * its end in a unit box (u along the shape, v across); the other half is the same
 * points turned 180°. A closed Catmull–Rom spline through them gives smooth curves.
 */
const SQUIGGLE_EDGE = [
  [0, 0.62], [0.02, 0.42], [0.06, 0.28], [0.13, 0.15], [0.27, 0.06], [0.41, 0.1], [0.53, 0.18],
  [0.64, 0.22], [0.76, 0.15], [0.85, 0.05], [0.91, 0], [0.965, 0.05], [0.99, 0.15],
]
const SQUIGGLE_POINTS = [...SQUIGGLE_EDGE, ...SQUIGGLE_EDGE.map(([u, v]) => [1 - u, 1 - v])]

const squiggle = (cx: number, cy: number) => {
  const width = 32
  const height = 68
  const p = SQUIGGLE_POINTS.map(([u, v]) => [cx + (v - 0.5) * width, cy + (0.5 - u) * height])
  const at = (i: number) => p[(i + p.length) % p.length]
  let d = `M ${f(p[0][0])} ${f(p[0][1])}`
  for (let i = 0; i < p.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${[...c1, ...c2, ...p2].map(f).join(' ')}`
  }
  return `${d} Z`
}

const DRAW = { oval: pill, diamond, squiggle }
const FILL = { open: 'white', striped: 'url(#stripes)', solid: 'black' }

for (const shape of SHAPES) {
  for (const shading of SHADINGS) {
    for (const number of NUMBERS) {
      const paths = Array.from({ length: number }, (_, i) => {
        const cx = W / 2 + (i - (number - 1) / 2) * SPACING
        return `<path d="${DRAW[shape](cx, H / 2)}" fill="${FILL[shading]}" stroke="black" stroke-width="${STROKE}" stroke-linejoin="round"/>`
      })
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<pattern id="stripes" patternUnits="userSpaceOnUse" width="6" height="5">
<line x1="0" y1="2.5" x2="6" y2="2.5" stroke="black" stroke-width="1.5"/>
</pattern>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="white" stroke="black"/>
${paths.join('\n')}
</svg>
`
      writeFileSync(new URL(`set_${shape}_${shading}_${number}.svg`, OUT), svg)
    }
  }
}
