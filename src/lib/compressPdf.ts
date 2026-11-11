import { GS_INPUT, GS_OUTPUT, runGhostscript } from './runGhostscript'

export type CompressionLevel = 'light' | 'balanced' | 'strong'

/**
 * I preset di Ghostscript per pdfwrite: /printer ricampiona le immagini a
 * 300 dpi, /ebook a 150 dpi.
 *
 * Strong parte da /ebook invece che da /screen: così differisce da Balanced
 * solo per quello che impostiamo noi (risoluzione e formato delle immagini,
 * vedi levelArgs), e non per altre impostazioni di /screen difficili da
 * prevedere.
 */
const presets: Record<CompressionLevel, string> = {
  light: '/printer',
  balanced: '/ebook',
  strong: '/ebook',
}

/**
 * Parametri aggiunti al preset, perché da soli i preset si somigliano troppo:
 *
 * - DownsampleThreshold: di default Ghostscript ricampiona un'immagine solo se
 *   supera di 1,5 volte la risoluzione del preset (con /ebook, solo oltre
 *   225 dpi). Con 1.0 ricampiona tutto quello che supera la risoluzione
 *   scelta, che è quello che l'utente si aspetta.
 * - PassThroughJPEGImages: di default i JPEG che non vanno ricampionati
 *   vengono copiati identici. Per Balanced e Strong li facciamo ricomprimere
 *   con la qualità del preset; Light li lascia intatti (nessuna perdita).
 *
 * Senza questi parametri, un PDF con foto a ~200 dpi esce identico con Light
 * e con Balanced.
 */
const thresholdArgs = [
  '-dColorImageDownsampleThreshold=1.0',
  '-dGrayImageDownsampleThreshold=1.0',
  '-dMonoImageDownsampleThreshold=1.0',
]
const recompressJpegArgs = ['-dPassThroughJPEGImages=false', '-dPassThroughJPXImages=false']

const levelArgs: Record<CompressionLevel, string[]> = {
  light: thresholdArgs,
  balanced: [...thresholdArgs, ...recompressJpegArgs],
  strong: [
    ...thresholdArgs,
    ...recompressJpegArgs,
    // Come Balanced, ma a 72 dpi. Le immagini in bianco e nero (testo
    // scansionato) restano a 300 dpi come nei preset: sotto diventano
    // illeggibili e pesano già poco.
    '-dColorImageResolution=72',
    '-dGrayImageResolution=72',
    // Sempre JPEG. Di default Ghostscript sceglie da solo tra JPEG e Flate
    // (senza perdita), e sulle immagini piccole e "rumorose" sceglie Flate:
    // su un PDF di prova con foto di rumore casuale Strong usciva così a
    // 19 MB contro i 13 MB di Balanced. Per il livello più forte vogliamo il
    // file più piccolo, anche a costo di qualche artefatto su loghi e grafiche.
    '-dAutoFilterColorImages=false',
    '-dColorImageFilter=/DCTEncode',
    '-dAutoFilterGrayImages=false',
    '-dGrayImageFilter=/DCTEncode',
  ],
}

const levelNames: Record<CompressionLevel, string> = {
  light: 'Light',
  balanced: 'Balanced',
  strong: 'Strong',
}

export type CompressResult = {
  bytes: Uint8Array
  originalSize: number
  compressedSize: number
}

/**
 * Comprime il PDF con Ghostscript (pdfwrite) e restituisce il nuovo file con
 * le dimensioni prima e dopo. Se il risultato non è più piccolo dell'originale
 * lancia un errore: dare all'utente un file uguale o più grande non ha senso.
 */
export async function compressPdf(
  file: File,
  level: CompressionLevel,
): Promise<CompressResult> {
  const input = new Uint8Array(await file.arrayBuffer())

  const args = [
    '-q',
    // -dSAFER impedisce al file di leggere o scrivere fuori da quanto serve:
    // il PDF arriva dall'utente, non ci fidiamo del suo contenuto.
    '-dSAFER',
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=pdfwrite',
    `-dPDFSETTINGS=${presets[level]}`,
    ...levelArgs[level],
    // Alcuni preset ruotano le pagine in base all'orientamento del testo:
    // in un compressore sarebbe una sorpresa, quindi lo disattiviamo.
    '-dAutoRotatePages=/None',
    `-sOutputFile=${GS_OUTPUT}`,
    GS_INPUT,
  ]

  const result = await runGhostscript(input, args)
  const log = result.log.join('\n').toLowerCase()

  if (result.exitCode !== 0 || !result.output) {
    if (log.includes('password')) {
      throw new Error(
        `"${file.name}" is password-protected. Remove its password with the Protect tool, then compress it.`,
      )
    }

    if (import.meta.env.DEV) {
      console.error('gs failed', result.exitCode, result.log)
    }

    throw new Error(
      `"${file.name}" could not be compressed. It may be damaged or not a real PDF.`,
    )
  }

  if (result.output.length >= input.length) {
    throw new Error(
      level === 'strong'
        ? `"${file.name}" is already as small as it can get: compressing it would not save any space.`
        : `"${file.name}" is already well optimized: the ${levelNames[level]} level could not make it smaller. Try a stronger level.`,
    )
  }

  return {
    bytes: result.output,
    originalSize: input.length,
    compressedSize: result.output.length,
  }
}
