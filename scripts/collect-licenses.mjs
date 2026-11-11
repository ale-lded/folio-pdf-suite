// Genera public/third-party-licenses.txt: i testi delle licenze di tutto il
// codice di terzi che il sito invia al browser.
//
// - Le librerie npm vengono lette dall'albero delle dipendenze di produzione
//   (`npm ls --omit=dev`), quindi un pacchetto aggiunto o aggiornato entra
//   nel file da solo.
// - I due motori WebAssembly (qpdf e Ghostscript) includono librerie native
//   che npm non vede: sono elencati a mano in `wasmComponents`.
//
// Gira prima di `npm run dev` e `npm run build` (script predev/prebuild).
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outFile = path.join(root, 'public', 'third-party-licenses.txt')
const rule = '='.repeat(78)

const wasmComponents = [
  {
    name: 'Ghostscript',
    version: readFileSync(path.join(root, 'src/vendor/ghostscript/VERSION'), 'utf8').trim(),
    license: 'AGPL-3.0-or-later',
    copyright: 'Copyright (C) 2001-2026 Artifex Software, Inc.',
    source: 'https://github.com/ArtifexSoftware/ghostpdl',
    text: 'Full text: see LICENSE in this repository (GNU Affero General Public License v3).',
    includes: [
      'FreeType: portions of this software are copyright (C) The FreeType Project (www.freetype.org). All rights reserved. FreeType License.',
      'libjpeg: this software is based in part on the work of the Independent JPEG Group. IJG License.',
      'Little CMS (lcms2mt): Copyright (C) Marti Maria Saguer. MIT License.',
      'OpenJPEG: Copyright (C) the OpenJPEG contributors. BSD 2-Clause License.',
      'zlib: Copyright (C) Jean-loup Gailly and Mark Adler. zlib License.',
      'libpng: Copyright (C) the PNG Reference Library authors. PNG Reference Library License.',
      'jbig2dec and extract: Copyright (C) Artifex Software, Inc. AGPL-3.0-or-later.',
    ],
  },
  {
    name: 'qpdf',
    version: '12.2.0',
    license: 'Apache-2.0',
    copyright: 'Copyright (C) 2005-2026 Jay Berkenbilt and the qpdf contributors',
    source: 'https://github.com/qpdf/qpdf',
    text: 'Apache License 2.0: same text as pdfjs-dist below.',
    includes: [
      'zlib: Copyright (C) Jean-loup Gailly and Mark Adler. zlib License.',
      'libjpeg: this software is based in part on the work of the Independent JPEG Group. IJG License.',
    ],
  },
]

function findLicenseFile(dir) {
  const match = readdirSync(dir).find((file) => /^(licen[sc]e|copying)(\.|$)/i.test(file))
  return match ? path.join(dir, match) : null
}

/** Testo della licenza: dal file LICENSE o, se manca, dalla sezione "License" del README. */
function licenseText(dir, declared) {
  const licenseFile = findLicenseFile(dir)
  if (licenseFile) return readFileSync(licenseFile, 'utf8').trim()

  const readme = readdirSync(dir).find((file) => /^readme(\.|$)/i.test(file))
  if (readme) {
    const text = readFileSync(path.join(dir, readme), 'utf8')
    const section = text.match(/^#+\s*licen[sc]e\s*$([\s\S]*?)(?=^#+\s|(?![\s\S]))/im)
    if (section) return section[1].trim()
  }

  return `No license text in the package. Declared license: ${declared}.`
}

// Pacchetti di produzione, senza duplicati (stesso nome e versione).
const tree = execSync('npm ls --omit=dev --all --parseable', { cwd: root, encoding: 'utf8' })
const packages = new Map()
for (const dir of tree.split('\n').filter((line) => line.includes('node_modules'))) {
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
  packages.set(`${pkg.name}@${pkg.version}`, { pkg, dir })
}

const sections = [
  'Folio PDF: third-party software',
  '',
  'Folio PDF is free software under the GNU AGPL v3. Its source code, including',
  'the scripts that build the WebAssembly engines, is at',
  'https://github.com/ale-lded/folio-pdf-suite',
  '',
  'This file lists the third-party software that the site sends to your browser,',
  'with its license. It is generated automatically at build time.',
]

sections.push('', rule, 'WebAssembly engines', rule)
for (const c of wasmComponents) {
  sections.push(
    '',
    `${c.name} ${c.version} (${c.license})`,
    c.copyright,
    `Source: ${c.source}`,
    c.text,
    'Includes:',
    ...c.includes.map((line) => `  - ${line}`),
  )
}

sections.push('', rule, 'JavaScript libraries', rule)
for (const { pkg, dir } of [...packages.values()].sort((a, b) =>
  a.pkg.name.localeCompare(b.pkg.name),
)) {
  sections.push(
    '',
    `--- ${pkg.name} ${pkg.version} (${pkg.license ?? 'see below'})`,
    '',
    licenseText(dir, pkg.license),
  )
}

if (!existsSync(path.dirname(outFile))) mkdirSync(path.dirname(outFile), { recursive: true })
writeFileSync(outFile, sections.join('\n') + '\n')
console.log(`third-party-licenses.txt: ${packages.size} npm packages, ${wasmComponents.length} WASM engines`)
