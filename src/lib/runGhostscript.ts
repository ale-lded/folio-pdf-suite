import type { GhostscriptRequest, GhostscriptResponse } from './ghostscript.worker'

/** Dove runGhostscript scrive il PDF in ingresso e da dove legge quello in uscita. */
export const GS_INPUT = '/input.pdf'
export const GS_OUTPUT = '/output.pdf'

export type GhostscriptResult = {
  exitCode: number
  output: Uint8Array | null
  /** Tutto quello che Ghostscript ha scritto su stdout/stderr. */
  log: string[]
}

/**
 * Esegue Ghostscript in un Web Worker dedicato e restituisce il risultato.
 * `args` devono usare GS_INPUT e GS_OUTPUT come file di ingresso e di uscita.
 * Come runQpdf, non interpreta il codice di uscita: lo fa chi chiama.
 */
export function runGhostscript(
  input: Uint8Array,
  args: string[],
): Promise<GhostscriptResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./ghostscript.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<GhostscriptResponse>) => {
      worker.terminate()
      const response = event.data

      if (import.meta.env.DEV) {
        console.debug('[gs]', args.join(' '), '→', response.ok ? `exit ${response.exitCode}` : response.error, response.log)
      }

      if (!response.ok) {
        reject(new Error(response.error))
        return
      }

      resolve({
        exitCode: response.exitCode,
        output: response.output ? new Uint8Array(response.output) : null,
        log: response.log,
      })
    }

    // Errori fuori dal try/catch del worker: WASM non scaricato (rete assente
    // alla prima volta), memoria esaurita all'avvio.
    worker.onerror = (event) => {
      worker.terminate()
      reject(
        new Error(
          event.message ||
            'The compression engine could not start. Check your connection and try again.',
        ),
      )
    }

    // Copiamo i byte in un buffer nuovo e lo trasferiamo: il chiamante
    // conserva il suo `input` intatto.
    const buffer = input.slice().buffer
    const request: GhostscriptRequest = { input: buffer, args }
    worker.postMessage(request, [buffer])
  })
}
