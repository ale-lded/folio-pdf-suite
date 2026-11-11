import { PDFDocument } from 'pdf-lib'

/**
 * Dove va la firma, espresso in FRAZIONI della pagina (0..1) così è indipendente
 * dalla risoluzione dell'anteprima: la stessa posizione vale a qualsiasi zoom.
 * `x`/`y` sono l'angolo in alto a sinistra della firma, contati dall'alto
 * (come sullo schermo). `width` è la larghezza della firma rispetto a quella
 * della pagina; l'altezza segue le proporzioni dell'immagine.
 */
export type SignPlacement = {
  pageIndex: number
  x: number
  y: number
  width: number
}

/**
 * Disegna un'immagine PNG della firma dentro il contenuto della pagina scelta e
 * restituisce il nuovo PDF. Disegnando nel contenuto (non come annotazione) la
 * firma risulta "appiattita": chi riceve il file non può spostarla o toglierla.
 */
export async function signPdf(
  file: File,
  signaturePng: Uint8Array,
  placement: SignPlacement,
): Promise<Uint8Array> {
  const fileBytes = await file.arrayBuffer()
  let pdf: PDFDocument

  try {
    pdf = await PDFDocument.load(fileBytes)
  } catch {
    throw new Error(
      `"${file.name}" could not be read. It may be damaged, password-protected or not a real PDF.`,
    )
  }

  const pages = pdf.getPages()

  if (placement.pageIndex < 0 || placement.pageIndex >= pages.length) {
    throw new Error(`That page doesn't exist: the PDF has ${pages.length} pages.`)
  }

  const page = pages[placement.pageIndex]
  const { width: pageWidth, height: pageHeight } = page.getSize()

  const png = await pdf.embedPng(signaturePng)

  // Dalle frazioni ai punti PDF. L'altezza segue le proporzioni del PNG.
  const drawWidth = placement.width * pageWidth
  const drawHeight = drawWidth * (png.height / png.width)
  const drawX = placement.x * pageWidth

  // Lo schermo conta la Y dall'alto, il PDF dal basso: convertiamo. `placement.y`
  // è il bordo superiore della firma, quindi partiamo da lì e scendiamo di
  // un'altezza per trovare il bordo inferiore (l'origine di drawImage).
  const topFromBottom = pageHeight - placement.y * pageHeight
  const drawY = topFromBottom - drawHeight

  page.drawImage(png, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  })

  return pdf.save()
}
