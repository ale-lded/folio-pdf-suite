# Folio PDF Suite

A private PDF toolkit that runs entirely in the browser. No backend, no accounts, no file storage: documents stay on the user's device from start to finish.

**Live at [folio.alessiomura.fr](https://folio.alessiomura.fr)**

- **Nothing is uploaded.** Every tool runs in the browser tab, so files and passwords never reach a server.
- **Real engines, compiled to WebAssembly.** Compression uses Ghostscript, built from source by this repository; password protection uses qpdf with AES-256.
- **Works on phones.** Touch-friendly controls, including drag to reorder with a long press.
- **Free software.** AGPL-3.0, with every third-party license listed on the site.

> **Status: working.** Merge, Split, Compress, Reorder, Protect and Sign all work. The tools in the "More tools" section are still placeholders.

## Tools

| Tool | What it does | Status |
| --- | --- | --- |
| Merge | Combine several PDFs in a chosen order | Working |
| Split | Split a document by page ranges | Working |
| Compress | Reduce file size with three quality levels | Working |
| Reorder | Change the order of the pages | Working |
| Protect | Add or remove a password (AES-256) | Working |
| Sign | Draw, type or upload a signature and place it on a chosen page | Working |

**Sign adds a visual mark only.** It is not a certificate-based digital signature and has no legal value.

## How it works

1. The user picks one or more files, which the browser reads into memory.
2. A library running in the page processes them. Compress and Protect run their WebAssembly engines in a Web Worker, so the page stays responsive. Merge, Split, Reorder and Sign still run on the main thread, so very large files can make the page less responsive.
3. The result is offered as a local download, and is released from memory when the user leaves the result screen.

There is no server to upload to, so one visitor's files cannot reach another visitor. Each browser tab holds its own data.

Client-side processing has real trade-offs:

- Available memory and speed depend on the user's device, and phones have much less headroom than desktops.
- Very large files can fail. The app currently rejects PDFs over 100 MB.
- Closing or reloading the tab discards any work in progress.
- Merge keeps page content but not bookmarks, forms or other document-level data.

## Libraries

| Library | Purpose | License |
| --- | --- | --- |
| [pdf-lib](https://pdf-lib.js.org/) | Merge, split, reorder, sign | MIT |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Page previews | Apache-2.0 |
| [JSZip](https://stuk.github.io/jszip/) | ZIP downloads for Split | MIT |
| [qpdf](https://qpdf.sourceforge.io/) 12.2, compiled to WebAssembly ([@neslinesli93/qpdf-wasm](https://github.com/neslinesli93/qpdf-wasm)) | Password protection | Apache-2.0 |
| [Ghostscript](https://www.ghostscript.com/) 10.08, compiled to WebAssembly by this repository | Compression | AGPL-3.0 |

`npm run dev` and `npm run build` first run `scripts/collect-licenses.mjs`, which writes `public/third-party-licenses.txt` with the license of every library the site sends to the browser. The site links to it from its Licenses page.

### Building Ghostscript

The Ghostscript engine in `src/vendor/ghostscript/` is built from source by the `ghostscript-wasm` workflow on GitHub Actions, with the recipe in `wasm/ghostscript/compile.sh` (Emscripten, only the `pdfwrite` device). To update it, run the workflow with a new ghostpdl tag, download the artifact and replace the files, as described in `src/vendor/ghostscript/README.md`.

## Tech stack

React 19, TypeScript, Vite and Tailwind CSS v4.

## Getting started

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

## Validation

```sh
npm run typecheck
npm run build
```

There are no automated tests yet.

## License

Folio PDF Suite is free software, released under the [GNU Affero General Public License v3.0 or later](LICENSE). This license was chosen so the project can include Ghostscript, which is distributed under the AGPL.

Copyright (C) 2026 Alessio Mura

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [license](LICENSE) for details.
