import createGhostscript from '../vendor/ghostscript/gs.mjs'
import wasmUrl from '../vendor/ghostscript/gs.wasm?url'
import { GS_INPUT, GS_OUTPUT } from './runGhostscript'

/**
 * Worker usa-e-getta, come quello di qpdf: ogni job crea un worker nuovo, esegue
 * Ghostscript UNA volta e viene terminato. La memoria WASM (che cresce ma non
 * si restringe) viene così liberata dopo ogni file.
 *
 * Il file .wasm (circa 11 MB compresso) viene scaricato al primo utilizzo; dopo
 * il browser lo serve dalla cache.
 */

export type GhostscriptRequest = {
  input: ArrayBuffer
  args: string[]
}

export type GhostscriptResponse =
  | { ok: true; exitCode: number; output: ArrayBuffer | null; log: string[] }
  | { ok: false; error: string; log: string[] }

// Il progetto compila con la lib DOM, dove `self` è una Window. Nel worker
// usiamo solo onmessage e postMessage con trasferimento: li tipizziamo qui.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<GhostscriptRequest>) => void) | null
  postMessage: (message: GhostscriptResponse, transfer?: Transferable[]) => void
}

scope.onmessage = async (event) => {
  const { input, args } = event.data
  const log: string[] = []

  try {
    // A differenza di qpdf, la nostra build accetta print/printErr: non serve
    // intercettare la console.
    const gs = await createGhostscript({
      locateFile: () => wasmUrl,
      print: (line) => log.push(line),
      printErr: (line) => log.push(line),
    })

    gs.FS.writeFile(GS_INPUT, new Uint8Array(input))

    // callMain aggiunge il nome del programma in testa all'array che riceve:
    // gli passiamo una copia per non modificare quello del chiamante.
    const exitCode = gs.callMain([...args])

    // Se Ghostscript non ha scritto il file, readFile lancia.
    let output: ArrayBuffer | null = null
    try {
      // slice() copia i byte fuori dalla memoria WASM in un buffer proprio,
      // che possiamo trasferire al thread principale senza copiarlo di nuovo.
      output = gs.FS.readFile(GS_OUTPUT).slice().buffer
    } catch {
      output = null
    }

    const response: GhostscriptResponse = { ok: true, exitCode, output, log }
    scope.postMessage(response, output ? [output] : [])
  } catch (error) {
    const response: GhostscriptResponse = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      log,
    }
    scope.postMessage(response)
  }
}
