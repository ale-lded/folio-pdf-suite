import type { QpdfRequest, QpdfResponse } from './qpdf.worker'

/** Dove runQpdf scrive il PDF in ingresso e da dove legge quello in uscita. */
export const QPDF_INPUT = '/input.pdf'
export const QPDF_OUTPUT = '/output.pdf'

export type QpdfResult = {
  exitCode: number
  output: Uint8Array | null
  /** Tutto quello che qpdf ha scritto su stdout/stderr. */
  log: string[]
}

/**
 * Esegue qpdf in un Web Worker dedicato e restituisce il risultato.
 * `args` sono gli argomenti della riga di comando di qpdf e devono usare
 * QPDF_INPUT e QPDF_OUTPUT come file di ingresso e di uscita.
 *
 * Non interpreta il codice di uscita: decidere cosa è un errore spetta a chi
 * chiama, che conosce l'operazione e può dare messaggi comprensibili.
 */
export function runQpdf(input: Uint8Array, args: string[]): Promise<QpdfResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./qpdf.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<QpdfResponse>) => {
      worker.terminate()
      const response = event.data

      if (!response.ok) {
        reject(new Error(response.error))
        return
      }

      if (import.meta.env.DEV) {
        // Le password non devono finire nella console, nemmeno in sviluppo.
        const safeArgs = args.map((arg) => arg.replace(/password=.*/, 'password=***'))
        console.debug('[qpdf]', safeArgs.join(' '), '→ exit', response.exitCode, response.log)
      }

      resolve({
        exitCode: response.exitCode,
        output: response.output ? new Uint8Array(response.output) : null,
        log: response.log,
      })
    }

    // Errori fuori dal nostro try/catch: worker che non si carica, WASM non
    // trovato, memoria esaurita durante l'avvio.
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'The PDF engine could not start.'))
    }

    // Copiamo i byte in un buffer nuovo e lo trasferiamo: il chiamante
    // conserva il suo `input` intatto.
    const buffer = input.slice().buffer
    const request: QpdfRequest = { input: buffer, args }
    worker.postMessage(request, [buffer])
  })
}
