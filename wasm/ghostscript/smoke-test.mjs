// Smoke test della build di Ghostscript: verifica che il modulo si carichi,
// che pdfwrite sia incluso e che una compressione produca un PDF valido.
// Uso: node smoke-test.mjs <cartella con gs.mjs e gs.wasm>
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const dir = path.resolve(process.argv[2] ?? 'dist')
const { default: createGhostscript } = await import(
  pathToFileURL(path.join(dir, 'gs.mjs')).href
)

const log = []
const gs = await createGhostscript({
  locateFile: (file) => path.join(dir, file),
  print: (line) => log.push(line),
  printErr: (line) => log.push(line),
})

function run(args) {
  log.length = 0
  const code = gs.callMain(args)
  console.log(`$ gs ${args.join(' ')}\n  → exit ${code}`)
  return code
}

function fail(message) {
  console.error(`FAIL: ${message}\n${log.join('\n')}`)
  process.exit(1)
}

// 1. pdfwrite deve essere tra i device disponibili.
run(['-h'])
if (!log.join(' ').includes('pdfwrite')) fail('pdfwrite is not in the device list')

// 2. Creiamo un PDF di prova da PostScript...
if (
  run([
    '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=pdfwrite',
    '-sOutputFile=/sample.pdf',
    '-c', '/Helvetica findfont 24 scalefont setfont 72 720 moveto (Folio) show showpage',
  ]) !== 0
) fail('could not create the sample PDF')

// 3. ...e lo comprimiamo come farà l'app.
if (
  run([
    '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=pdfwrite',
    '-dPDFSETTINGS=/ebook', '-sOutputFile=/compressed.pdf', '/sample.pdf',
  ]) !== 0
) fail('compression failed')

const output = gs.FS.readFile('/compressed.pdf')
const header = new TextDecoder().decode(output.subarray(0, 5))
if (header !== '%PDF-') fail(`output is not a PDF (starts with "${header}")`)

console.log(`OK: compressed PDF is ${output.length} bytes`)
