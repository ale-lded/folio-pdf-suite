import { PDFDocument } from 'pdf-lib'

/**
 * Rebuilds a PDF with its pages in a new order. `order` is the new sequence of
 * page indices, counted from 0: `[2, 0, 1]` means "put the third page first,
 * then the first, then the second".
 *
 * It does not have to list every page, so dropping an index removes that page
 * from the result — which also makes this a "delete pages" primitive.
 */
export async function reorderPdf(
  file: File,
  order: number[],
): Promise<Uint8Array> {
  // 1. leggi i byte e caricali come PDF
  const fileBytes = await file.arrayBuffer()
  let sourcePdf: PDFDocument

  try {
    sourcePdf = await PDFDocument.load(fileBytes)
  } catch {
    throw new Error(
      `"${file.name}" could not be read. It may be damaged, password-protected or not a real PDF.`,
    )
  }

  const pageCount = sourcePdf.getPageCount()

  // 2. controlla l'ordine prima di costruire qualcosa
  if (order.length === 0) {
    throw new Error('Keep at least one page in the new order.')
  }

  for (const index of order) {
    if (!Number.isInteger(index)) {
      throw new Error(`Page positions must be whole numbers (got ${index}).`)
    }

    if (index < 0 || index >= pageCount) {
      throw new Error(
        `Page ${index + 1} doesn't exist: "${file.name}" has ${pageCount} pages.`,
      )
    }
  }

  // 3. crea un nuovo documento e copia le pagine NELL'ORDINE richiesto.
  // copyPages rispetta l'ordine dell'array, quindi è qui che avviene il riordino.
  const out = await PDFDocument.create()
  const copiedPages = await out.copyPages(sourcePdf, order)

  for (const page of copiedPages) {
    out.addPage(page)
  }

  // 4. salva e restituisci
  return out.save()
}
