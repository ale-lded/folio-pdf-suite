import { QPDF_INPUT, QPDF_OUTPUT, runQpdf } from './runQpdf'

/** Cosa fa la pagina Proteggi: aggiungere una password o toglierla. */
export type ProtectMode = 'add' | 'remove'

// AES-256 (PDF 2.0) usa al massimo i primi 127 byte UTF-8 della password:
// oltre verrebbero ignorati in silenzio, quindi li rifiutiamo prima.
const maxPasswordBytes = 127

/**
 * Cifra il PDF con AES-256 usando qpdf e restituisce il nuovo file: per
 * aprirlo servirà `password`. Il contenuto non viene ricompresso né
 * modificato: qpdf cifra stringhe e stream così come sono.
 */
export async function protectPdf(file: File, password: string): Promise<Uint8Array> {
  if (password === '') {
    throw new Error('Enter a password to protect the PDF.')
  }
  if (new TextEncoder().encode(password).length > maxPasswordBytes) {
    throw new Error('The password is too long. Use at most 127 characters.')
  }

  // Le password vanno passate come opzioni con nome e non come argomenti
  // posizionali: una password che inizia con "-" o "@" verrebbe altrimenti
  // letta da qpdf come un'opzione o come un file di argomenti.
  //
  // qpdf (dalla 11) rifiuta una password proprietario vuota insieme a una di
  // apertura, perché chiunque potrebbe aprire il file come proprietario: senza
  // restrizioni da proteggere, usiamo la stessa password per entrambe.
  const args = [
    QPDF_INPUT,
    '--encrypt',
    `--user-password=${password}`,
    `--owner-password=${password}`,
    '--bits=256',
    '--',
    QPDF_OUTPUT,
  ]

  const input = new Uint8Array(await file.arrayBuffer())
  const result = await runQpdf(input, args)

  // 0 = tutto ok, 3 = ok con avvisi (file leggermente danneggiato ma
  // riparato): in entrambi i casi il file in uscita è valido.
  if ((result.exitCode === 0 || result.exitCode === 3) && result.output) {
    return result.output
  }

  const log = result.log.join('\n').toLowerCase()

  if (log.includes('invalid password')) {
    throw new Error(
      `"${file.name}" is already password-protected. Use "Remove password" first, then protect it again.`,
    )
  }

  if (import.meta.env.DEV) {
    console.error('qpdf failed', result.exitCode, result.log)
  }

  throw new Error(
    `"${file.name}" could not be protected. It may be damaged or not a real PDF.`,
  )
}
