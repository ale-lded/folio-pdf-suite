// Tipi per il modulo generato da Emscripten (wasm/ghostscript/compile.sh).
// Descriviamo solo quello che usiamo.

export type GhostscriptModule = {
  callMain: (args: string[]) => number
  FS: {
    writeFile: (path: string, data: Uint8Array) => void
    readFile: (path: string) => Uint8Array
  }
}

export type GhostscriptOptions = {
  locateFile?: (file: string) => string
  print?: (line: string) => void
  printErr?: (line: string) => void
}

declare function createGhostscript(options?: GhostscriptOptions): Promise<GhostscriptModule>

export default createGhostscript
