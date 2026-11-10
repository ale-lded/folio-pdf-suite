import JSZip from 'jszip'

/**
 * Packs the PDFs produced by `splitPdf` into a single .zip, so the user gets
 * one download instead of N. Files are named after the source, numbered and
 * zero-padded so they sort correctly: "report-01.pdf", "report-02.pdf", …
 */
export async function zipPdfs(
  parts: Uint8Array[],
  sourceName: string,
): Promise<Blob> {
  const zip = new JSZip()

  // Togli l'estensione ".pdf" dal nome di partenza per usarlo come base.
  const stem = sourceName.replace(/\.pdf$/i, '') || 'split'

  // Quante cifre servono per numerare (10 file -> "01", 100 file -> "001").
  const width = String(parts.length).length

  parts.forEach((bytes, index) => {
    const number = String(index + 1).padStart(width, '0')
    zip.file(`${stem}-${number}.pdf`, bytes)
  })

  return zip.generateAsync({ type: 'blob' })
}
