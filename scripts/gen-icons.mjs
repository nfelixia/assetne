import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const svg = readFileSync(resolve(root, 'public/favicon.svg'), 'utf-8')

const sizes = [
  { name: 'apple-touch-icon.png',        size: 180 },
  { name: 'android-chrome-192x192.png',  size: 192 },
  { name: 'android-chrome-512x512.png',  size: 512 },
  { name: 'favicon-32x32.png',           size: 32  },
  { name: 'favicon-16x16.png',           size: 16  },
  { name: 'favicon.png',                 size: 64  },
]

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(resolve(root, 'public', name), png)
  console.log(`✓ ${name} (${size}x${size})`)
}
