import createModule from '@neslinesli93/qpdf-wasm'
import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'
import { QPDF_INPUT, QPDF_OUTPUT } from './runQpdf'

/**
 * Worker usa-e-getta: ogni job crea un worker nuovo, esegue qpdf UNA volta e
 * poi viene terminato da runQpdf. Così:
 * - la UI non si blocca mentre qpdf lavora su file grandi;
 * - la memoria WASM (che cresce ma non si restringe mai) viene liberata;
 * - nessuno stato di qpdf sopravvive tra un'esecuzione e l'altra.
 * Lo stesso schema servirà per Ghostscript in Compress.
 */

export type QpdfRequest = {
  input: ArrayBuffer
  args: string[]
}

export type QpdfResponse =
  | { ok: true; exitCode: number; output: ArrayBuffer | null; log: string[] }
  | { ok: false; error: string; log: string[] }

// Questa build di qpdf lega stdout/stderr a console.log/console.error nel
// momento in cui il modulo viene creato, e non accetta `print`/`printErr`.
// Per leggere i messaggi di qpdf (es. "invalid password") sostituiamo la
// console del worker PRIMA di chiamare createModule.
const log: string[] = []
const capture = (...parts: unknown[]) => log.push(parts.map(String).join(' '))
console.log = capture
console.error = capture
console.warn = capture

// I tipi del pacchetto sono incompleti (mancano writeFile, unlink e le opzioni
// di Emscripten): descriviamo qui solo quello che usiamo davvero.
type QpdfRuntime = {
  callMain: (args: string[]) => number
  FS: {
    writeFile: (path: string, data: Uint8Array) => void
    readFile: (path: string) => Uint8Array
  }
}
type CreateQpdf = (options: { locateFile: () => string }) => Promise<QpdfRuntime>

// Il progetto compila con la lib DOM, dove `self` è una Window. Nel worker
// usiamo solo onmessage e postMessage con trasferimento: li tipizziamo qui.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<QpdfRequest>) => void) | null
  postMessage: (message: QpdfResponse, transfer?: Transferable[]) => void
}

scope.onmessage = async (event: MessageEvent<QpdfRequest>) => {
  const { input, args } = event.data

  try {
    const qpdf = await (createModule as unknown as CreateQpdf)({
      locateFile: () => wasmUrl,
    })

    qpdf.FS.writeFile(QPDF_INPUT, new Uint8Array(input))

    // callMain restituisce il codice di uscita anche quando qpdf termina con
    // exit(n): 0 = ok, 2 = errore, 3 = ok ma con avvisi.
    const exitCode = qpdf.callMain(args)

    // Questa build non include FS.analyzePath, quindi per sapere se qpdf ha
    // scritto il file proviamo a leggerlo: se non esiste readFile lancia.
    let output: ArrayBuffer | null = null
    try {
      // slice() copia i byte fuori dalla memoria WASM in un buffer proprio,
      // che possiamo trasferire al thread principale senza copiarlo di nuovo.
      output = qpdf.FS.readFile(QPDF_OUTPUT).slice().buffer
    } catch {
      output = null
    }

    const response: QpdfResponse = { ok: true, exitCode, output, log }
    scope.postMessage(response, output ? [output] : [])
  } catch (error) {
    const response: QpdfResponse = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      log,
    }
    scope.postMessage(response)
  }
}
