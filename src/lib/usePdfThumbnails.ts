import { useEffect, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// pdf.js fa il lavoro pesante (il parsing del PDF) in un Web Worker, così il
// rendering non blocca la UI. Gli diciamo una volta dove trovarlo: Vite ci dà
// l'URL del file già impacchettato con `?url`.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfThumbnails = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Numero di pagine, noto quasi subito (0 finché non si sa). */
  pageCount: number
  /** Un URL per pagina (indice = pagina), `null` finché quella pagina non è resa. */
  thumbs: (string | null)[]
}

const EMPTY: PdfThumbnails = { status: 'idle', pageCount: 0, thumbs: [] }

export type RenderedPage = {
  /**
   * Immagine della pagina come DATA URL. Scelta volutamente invece di un blob
   * URL: un data URL non può essere revocato, quindi l'anteprima non può
   * "rompersi" durante i molti re-render (es. mentre si trascina uno slider).
   */
  url: string
  /** Dimensioni della pagina in punti PDF, utili a calcolare le proporzioni. */
  width: number
  height: number
}

/**
 * Rende UNA pagina a risoluzione utile (non una miniatura): serve all'area di
 * posizionamento della firma, dove la pagina deve vedersi nitida.
 */
export async function renderPdfPage(
  file: File,
  pageIndex: number,
  targetWidth = 680,
): Promise<RenderedPage> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise

  try {
    const page = await pdf.getPage(pageIndex + 1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: targetWidth / base.width })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas not available')
    }

    await page.render({ canvasContext: context, viewport }).promise
    page.cleanup()

    return {
      url: canvas.toDataURL('image/jpeg', 0.85),
      width: base.width,
      height: base.height,
    }
  } finally {
    await pdf.destroy()
  }
}

/**
 * Rende le pagine di un PDF in miniature, una alla volta e in modo progressivo:
 * `pageCount` arriva subito, poi ogni `thumbs[i]` si popola man mano che la
 * pagina viene disegnata, così la griglia si riempie sotto gli occhi.
 *
 * Riusabile da qualunque strumento che debba mostrare le pagine (Reorder oggi,
 * PDF→Images domani).
 */
export function usePdfThumbnails(
  file: File | null,
  targetWidth = 150,
): PdfThumbnails {
  const [state, setState] = useState<PdfThumbnails>(EMPTY)

  useEffect(() => {
    if (!file) {
      setState(EMPTY)
      return
    }

    let cancelled = false
    const createdUrls: string[] = []
    setState({ status: 'loading', pageCount: 0, thumbs: [] })

    async function render() {
      try {
        const data = await file!.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data }).promise

        if (cancelled) {
          await pdf.destroy()
          return
        }

        const count = pdf.numPages
        setState({
          status: 'loading',
          pageCount: count,
          thumbs: Array<string | null>(count).fill(null),
        })

        for (let pageNumber = 1; pageNumber <= count; pageNumber++) {
          if (cancelled) break

          const page = await pdf.getPage(pageNumber)
          // Scala per ottenere circa `targetWidth` px di larghezza.
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: targetWidth / base.width })

          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          const context = canvas.getContext('2d')

          if (!context) {
            page.cleanup()
            continue
          }

          await page.render({ canvasContext: context, viewport }).promise
          page.cleanup()

          if (cancelled) break

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.7),
          )

          if (!blob || cancelled) continue

          const url = URL.createObjectURL(blob)
          createdUrls.push(url)

          // Inserisco la miniatura appena pronta, lasciando il resto com'è.
          setState((prev) => {
            const thumbs = prev.thumbs.slice()
            thumbs[pageNumber - 1] = url
            return { ...prev, thumbs }
          })
        }

        if (!cancelled) {
          setState((prev) => ({ ...prev, status: 'ready' }))
        }

        await pdf.destroy()
      } catch {
        if (!cancelled) {
          setState({ status: 'error', pageCount: 0, thumbs: [] })
        }
      }
    }

    render()

    // Al cambio file / smontaggio: fermo il lavoro e libero la memoria delle
    // immagini create (i blob URL vanno revocati a mano).
    return () => {
      cancelled = true
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [file, targetWidth])

  return state
}
