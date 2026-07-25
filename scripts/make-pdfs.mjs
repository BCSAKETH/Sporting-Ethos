import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { execFileSync } from 'child_process'
import { pathToFileURL } from 'url'
import path from 'path'
import { marked } from 'marked'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = path.resolve('docs/pdf')
mkdirSync(outDir, { recursive: true })

const docs = [
  { src: 'docs/01-Solution-Architecture.md', name: 'M1-Solution-Architecture' },
  { src: 'docs/02-User-Flow.md', name: 'M1-User-Flow' },
  { src: 'docs/03-Implementation-Plan.md', name: 'M1-Implementation-Plan' },
  { src: 'docs/Milestone-2-MVP-and-Validation.md', name: 'M2-MVP-and-Validation' },
  { src: 'docs/Milestone-3-Presentation.md', name: 'M3-Presentation' },
]

const css = `
  @page { size: A4; margin: 20mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.55; }
  h1 { color: #065f46; font-size: 22px; border-bottom: 3px solid #10b981; padding-bottom: 6px; margin: 0 0 12px; }
  h2 { color: #065f46; font-size: 16px; margin: 20px 0 8px; }
  h3 { color: #0f766e; font-size: 13px; margin: 14px 0 6px; }
  p, li { font-size: 12px; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 4px; font-size: 11px; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; overflow-x: auto; font-size: 10px; line-height: 1.4; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 11px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #ecfdf5; color: #065f46; }
  tr:nth-child(even) td { background: #f8fafc; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  a { color: #059669; }
  blockquote { border-left: 3px solid #10b981; margin: 8px 0; padding: 2px 12px; color: #475569; background: #f0fdf4; }
`

for (const d of docs) {
  const md = readFileSync(d.src, 'utf8')
  const body = String(marked.parse(md))
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`
  const htmlPath = path.join(outDir, d.name + '.html')
  writeFileSync(htmlPath, html)
  const pdfPath = path.join(outDir, d.name + '.pdf')
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' })
  console.log('✓', pdfPath)
}
console.log('done')
