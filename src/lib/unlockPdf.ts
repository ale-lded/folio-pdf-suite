import { QPDF_INPUT, QPDF_OUTPUT, runQpdf, type QpdfResult } from './runQpdf'

function logText(result: QpdfResult) {
  return result.log.join('\n').toLowerCase()
}

/**
 * Toglie la cifratura dal PDF e restituisce il file sbloccato. Serve la
 * password di apertura; per i PDF con sole restrizioni (si aprono senza
 * password) `password` può essere vuota.
 */
export async function unlockPdf(file: File, password: string): Promise<Uint8Array> {
  const input = new Uint8Array(await file.arrayBuffer())

  // Le password vanno come opzione con nome: se iniziassero con "-" o "@" non
  // verrebbero scambiate per un'opzione o per un file di argomenti.
  const passwordArg = `--password=${password}`

  function wrongPassword(): Error {
    return new Error(
      password === ''
        ? `"${file.name}" needs its password to be unlocked. Enter it and try again.`
        : "That password isn't correct. Check it and try again.",
    )
  }

  // Primo passo: --show-encryption con la password. Un solo comando ci dice
  // se il file è cifrato ("File is not encrypted" se non lo è) e se la
  // password è giusta ("invalid password" se è sbagliata).
  // Non usiamo --is-encrypted: con un file protetto da password fallisce
  // invece di rispondere "sì", perché non riesce ad aprirlo.
  // Senza questo controllo --decrypt riuscirebbe anche su un file non cifrato
  // e l'utente scaricherebbe lo stesso file senza capire perché.
  const check = await runQpdf(input, [passwordArg, '--show-encryption', QPDF_INPUT])
  const checkLog = logText(check)

  if (checkLog.includes('invalid password')) {
    throw wrongPassword()
  }
  if (checkLog.includes('not encrypted')) {
    throw new Error(`"${file.name}" isn't password-protected, so there's nothing to remove.`)
  }
  if (check.exitCode !== 0 && check.exitCode !== 3) {
    if (import.meta.env.DEV) {
      console.error('qpdf --show-encryption failed', check.exitCode, check.log)
    }
    throw new Error(`"${file.name}" could not be read. It may be damaged or not a real PDF.`)
  }

  // Secondo passo: il file è cifrato e la password è giusta, decifriamo.
  const result = await runQpdf(input, [passwordArg, '--decrypt', QPDF_INPUT, QPDF_OUTPUT])

  // 0 = ok, 3 = ok con avvisi: il file in uscita è valido in entrambi i casi.
  if ((result.exitCode === 0 || result.exitCode === 3) && result.output) {
    return result.output
  }

  if (logText(result).includes('invalid password')) {
    throw wrongPassword()
  }

  if (import.meta.env.DEV) {
    console.error('qpdf --decrypt failed', result.exitCode, result.log)
  }

  throw new Error(
    `"${file.name}" could not be unlocked. It may be damaged or not a real PDF.`,
  )
}
