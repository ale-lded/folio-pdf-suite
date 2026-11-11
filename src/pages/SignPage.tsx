import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Icon } from '../components/Icon'
import { SelectionNotice } from '../components/SelectionNotice'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { addPdfFiles, formatFileSize } from '../lib/pdfFiles'
import { renderPdfPage, usePdfThumbnails } from '../lib/usePdfThumbnails'
import type { RenderedPage } from '../lib/usePdfThumbnails'
import type { SignPlacement } from '../lib/signPdf'

type SignatureMode = 'draw' | 'type' | 'upload'

type SignPageProps = {
  /** Quanti PDF sono selezionati: se più di uno, la pagina usa il primo. */
  selectedCount: number
  file: File | null
  onFileChange: (file: File | null) => void
  onStart: (
    file: File,
    signaturePng: Uint8Array,
    placement: SignPlacement,
  ) => void
  onBack: () => void
  signError: string | null
}

const INK = '#16181d'

// Un PNG data URL -> i suoi byte, per darli a pdf-lib (embedPng).
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Trasforma il nome digitato in un PNG trasparente, ritagliato sul testo.
function textToPng(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return null

  const font = "italic 72px 'Snell Roundhand', 'Segoe Script', cursive"
  context.font = font
  const width = Math.ceil(context.measureText(trimmed).width) + 40

  canvas.width = width
  canvas.height = 120
  // Ridimensionare il canvas azzera il contesto: reimposto il font.
  context.font = font
  context.fillStyle = INK
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(trimmed, canvas.width / 2, canvas.height / 2)

  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

// Normalizza un'immagine caricata in PNG (così pdf-lib usa sempre embedPng).
async function imageFileToPng(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas not available')
    context.drawImage(image, 0, 0)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function SignPage({
  selectedCount,
  file,
  onFileChange,
  onStart,
  onBack,
  signError,
}: SignPageProps) {
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [typedName, setTypedName] = useState('')
  const [drawnSig, setDrawnSig] = useState<string | null>(null)
  const [typedSig, setTypedSig] = useState<string | null>(null)
  const [uploadedSig, setUploadedSig] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDrawingRef = useRef(false)

  // La firma attiva, qualunque sia il metodo scelto. Tutto confluisce in un PNG.
  const signature =
    mode === 'draw' ? drawnSig : mode === 'type' ? typedSig : uploadedSig
  const [sigAspect, setSigAspect] = useState(0.4) // altezza / larghezza

  // Pagine del PDF (picker) e pagina selezionata per la firma.
  const { pageCount, thumbs } = usePdfThumbnails(file)
  const [selectedPage, setSelectedPage] = useState(0)

  // Anteprima nitida della pagina selezionata + posizionamento della firma.
  const [renderedPage, setRenderedPage] = useState<RenderedPage | null>(null)
  const [placement, setPlacement] = useState({ x: 0.32, y: 0.72, width: 0.34 })
  const placementRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    posX: number
    posY: number
  } | null>(null)

  // Nuovo file: riparti da pagina 0 e posizione predefinita.
  useEffect(() => {
    setSelectedPage(0)
    setPlacement({ x: 0.32, y: 0.72, width: 0.34 })
    setMessage(null)
  }, [file])

  // Il testo digitato diventa un PNG mentre si scrive.
  useEffect(() => {
    setTypedSig(textToPng(typedName))
  }, [typedName])

  // Appena c'è una firma, ne misuro le proporzioni (servono al drag e al PDF).
  useEffect(() => {
    if (!signature) return
    let cancelled = false
    loadImage(signature).then((image) => {
      if (!cancelled && image.naturalWidth > 0) {
        setSigAspect(image.naturalHeight / image.naturalWidth)
      }
    })
    return () => {
      cancelled = true
    }
  }, [signature])

  // Rende la pagina selezionata ad alta risoluzione (data URL, vedi RenderedPage).
  useEffect(() => {
    if (!file) {
      setRenderedPage(null)
      return
    }

    let cancelled = false

    renderPdfPage(file, selectedPage)
      .then((page) => {
        if (!cancelled) setRenderedPage(page)
      })
      .catch(() => {
        if (!cancelled) setRenderedPage(null)
      })

    return () => {
      cancelled = true
    }
  }, [file, selectedPage])

  // ---- Disegno a mano libera -------------------------------------------------
  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const bounds = canvas?.getBoundingClientRect()
    if (!canvas || !bounds) return null
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    }
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const point = getCanvasPoint(event)
    const context = canvasRef.current?.getContext('2d')
    if (!point || !context) return
    event.currentTarget.setPointerCapture(event.pointerId)
    isDrawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  function continueDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const point = getCanvasPoint(event)
    const context = canvasRef.current?.getContext('2d')
    if (!point || !context) return
    context.strokeStyle = INK
    context.lineWidth = 2.5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function finishDrawing() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) setDrawnSig(canvas.toDataURL('image/png'))
  }

  function clearDrawing() {
    const context = canvasRef.current?.getContext('2d')
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setDrawnSig(null)
  }

  function clearSignature() {
    clearDrawing()
    setTypedName('')
    setTypedSig(null)
    setUploadedSig(null)
    setImageName(null)
    setMessage(null)
  }

  async function chooseSignatureImage(imageFile: File | undefined) {
    if (!imageFile) return
    if (!imageFile.type.startsWith('image/')) {
      setMessage('Choose an image file for the signature.')
      return
    }
    try {
      setUploadedSig(await imageFileToPng(imageFile))
      setImageName(imageFile.name)
      setMessage(null)
    } catch {
      setMessage("That image couldn't be read.")
    }
  }

  // ---- Scelta del PDF --------------------------------------------------------
  function choosePdf(fileList: FileList) {
    const result = addPdfFiles([], fileList)
    const [chosen] = result.added
    if (!chosen) {
      setMessage('Choose a PDF file that is no larger than 100 MB.')
      return
    }
    setMessage(null)
    onFileChange(chosen)
  }

  // ---- Trascinamento della firma sulla pagina --------------------------------
  function onSigPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      posX: placement.x,
      posY: placement.y,
    }
  }

  function onSigPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const container = placementRef.current
    if (!drag || !container) return

    const rect = container.getBoundingClientRect()
    const dx = (event.clientX - drag.startX) / rect.width
    const dy = (event.clientY - drag.startY) / rect.height

    // Altezza della firma come frazione della pagina, per non farla uscire.
    const pageAspect = renderedPage ? renderedPage.width / renderedPage.height : 1
    const heightFraction = placement.width * sigAspect * pageAspect

    const maxX = Math.max(0, 1 - placement.width)
    const maxY = Math.max(0, 1 - heightFraction)
    const clamp = (value: number, max: number) =>
      Math.min(max, Math.max(0, value))

    setPlacement((prev) => ({
      ...prev,
      x: clamp(drag.posX + dx, maxX),
      y: clamp(drag.posY + dy, maxY),
    }))
  }

  function onSigPointerUp() {
    dragRef.current = null
  }

  // ---- Dimensione della firma ------------------------------------------------
  // Cambia la larghezza tenendo fermo il CENTRO della firma (sembra uno zoom
  // sul posto), poi la riporta dentro la pagina se ora sborda.
  function resizeSignature(newWidth: number) {
    const pageAspect = renderedPage ? renderedPage.width / renderedPage.height : 1

    setPlacement((prev) => {
      const oldHeight = prev.width * sigAspect * pageAspect
      const newHeight = newWidth * sigAspect * pageAspect
      const centerX = prev.x + prev.width / 2
      const centerY = prev.y + oldHeight / 2
      const clamp = (value: number, max: number) =>
        Math.min(Math.max(0, max), Math.max(0, value))

      return {
        width: newWidth,
        x: clamp(centerX - newWidth / 2, 1 - newWidth),
        y: clamp(centerY - newHeight / 2, 1 - newHeight),
      }
    })
  }

  function apply() {
    if (!file) {
      setMessage('Choose a PDF to sign.')
      return
    }
    if (!signature) {
      setMessage('Create a signature first.')
      return
    }
    onStart(file, dataUrlToBytes(signature), {
      pageIndex: selectedPage,
      x: placement.x,
      y: placement.y,
      width: placement.width,
    })
  }

  const pageAspect = renderedPage ? renderedPage.width / renderedPage.height : 0.72

  return (
    <section aria-labelledby="sign-title" className="workspace sign-page">
      <WorkspaceHeading
        description="Drop a signature onto your PDF. It is a visual signature, flattened into the page — not a certified digital signature."
        eyebrow="Add your signature"
        icon="sign"
        onBack={onBack}
        title="Sign PDF"
        titleId="sign-title"
      />

      <div className="sign-layout">
        <aside aria-label="Signature options" className="sign-controls">
          {/* 1. Il PDF */}
          <SelectionNotice count={selectedCount} toolName="Sign" />
          {file ? (
            <div className="file-row">
              <span aria-hidden="true" className="file-row__icon">
                <Icon name="file" size={18} />
              </span>
              <span className="file-row__details">
                <strong>{file.name}</strong>
                <small>
                  {formatFileSize(file.size)} · PDF
                  {pageCount > 0 &&
                    ` · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}
                </small>
              </span>
              <div className="file-row__actions">
                <button
                  aria-label={`Remove ${file.name}`}
                  className="icon-button icon-button--remove"
                  onClick={() => onFileChange(null)}
                  type="button"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`upload-box${isDragging ? ' upload-box--active' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault()
                if (event.dataTransfer.types.includes('Files')) {
                  setIsDragging(true)
                }
              }}
              onDragLeave={(event) => {
                const next = event.relatedTarget
                if (
                  !(next instanceof Node) ||
                  !event.currentTarget.contains(next)
                ) {
                  setIsDragging(false)
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragging(false)
                choosePdf(event.dataTransfer.files)
              }}
            >
              <span className="upload-box__icon">
                <Icon name="upload" size={26} />
              </span>
              <div className="upload-box__text">
                <strong>Drop a PDF here</strong>
                <p>or select one from your device</p>
              </div>
              <button
                className="button button--secondary"
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                Browse files
              </button>
              <input
                accept="application/pdf,.pdf"
                aria-label="Choose a PDF file"
                className="visually-hidden"
                onChange={(event) => {
                  if (event.currentTarget.files) {
                    choosePdf(event.currentTarget.files)
                    event.currentTarget.value = ''
                  }
                }}
                ref={inputRef}
                type="file"
              />
            </div>
          )}

          {/* 2. Il metodo di firma */}
          <div aria-label="Signature method" className="signature-tabs" role="group">
            {(['draw', 'type', 'upload'] as const).map((option) => (
              <button
                aria-pressed={mode === option}
                className={`signature-tab${mode === option ? ' signature-tab--selected' : ''}`}
                key={option}
                onClick={() => {
                  setMode(option)
                  setMessage(null)
                }}
                type="button"
              >
                <Icon
                  name={
                    option === 'draw' ? 'draw' : option === 'type' ? 'type' : 'upload'
                  }
                  size={15}
                />
                {option === 'draw' ? 'Draw' : option === 'type' ? 'Type' : 'Upload'}
              </button>
            ))}
          </div>

          <div aria-label={`${mode} signature`} className="signature-panel" role="region">
            {mode === 'draw' ? (
              <canvas
                aria-label="Draw your signature"
                className="signature-canvas"
                height={160}
                onPointerCancel={finishDrawing}
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={finishDrawing}
                ref={canvasRef}
                width={560}
              />
            ) : mode === 'type' ? (
              <label className="signature-input-label">
                Type your name
                <input
                  autoComplete="name"
                  maxLength={80}
                  onChange={(event) => setTypedName(event.currentTarget.value)}
                  placeholder="Your name"
                  type="text"
                  value={typedName}
                />
              </label>
            ) : (
              <label className="signature-upload">
                <Icon name="upload" size={22} />
                <strong>{imageName ?? 'Choose a signature image'}</strong>
                <small>Transparent PNG works best</small>
                <input
                  accept="image/*"
                  className="visually-hidden"
                  onChange={(event) =>
                    chooseSignatureImage(event.currentTarget.files?.[0])
                  }
                  type="file"
                />
              </label>
            )}
          </div>

          <div className="sign-controls__actions">
            <button
              className="button button--secondary"
              onClick={clearSignature}
              type="button"
            >
              Clear signature
            </button>
            <button
              className="button button--primary"
              disabled={!file || !signature}
              onClick={apply}
              type="button"
            >
              Sign PDF
              <Icon name="arrow" size={16} />
            </button>
          </div>

          {(message || signError) && (
            <p
              className={`form-message${signError ? ' form-message--error' : ''}`}
              role={signError ? 'alert' : 'status'}
            >
              {signError ?? message}
            </p>
          )}

          <p className="privacy-note">
            <Icon name="lock" size={14} />
            Everything happens on your device. The signature is flattened into
            the page.
          </p>
        </aside>

        <section aria-label="Signature placement" className="sign-preview">
          {!file ? (
            <div className="sign-preview__empty">
              <span className="icon-disc">
                <Icon name="sign" />
              </span>
              <strong>Choose a PDF to sign</strong>
              <p>Then drag your signature onto the page.</p>
            </div>
          ) : (
            <div className="sign-stage">
              {pageCount > 1 && (
                <div className="sign-page-picker" role="tablist" aria-label="Pick a page">
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      aria-label={`Page ${index + 1}`}
                      aria-selected={selectedPage === index}
                      className={`sign-page-thumb${selectedPage === index ? ' sign-page-thumb--selected' : ''}`}
                      key={index}
                      onClick={() => setSelectedPage(index)}
                      role="tab"
                      type="button"
                    >
                      {thumbs[index] ? (
                        <img alt="" draggable={false} src={thumbs[index] ?? undefined} />
                      ) : (
                        <span className="sign-page-thumb__wait" />
                      )}
                      <span className="sign-page-thumb__n">{index + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Colonna destra: la pagina selezionata, con tutto lo spazio che resta. */}
              <div className="sign-stage__main">
                <div className="sign-stage__canvas">
                  {/* L'immagine si limita in altezza (vh), il box la avvolge
                      esattamente: la firma (in percentuale) resta allineata. */}
                  <div className="sign-placement" ref={placementRef}>
                    {renderedPage ? (
                      <>
                        <img
                          alt={`Page ${selectedPage + 1}`}
                          className="sign-placement__page"
                          draggable={false}
                          src={renderedPage.url}
                        />
                        {signature && (
                          <div
                            className="sign-placement__sig"
                            onPointerDown={onSigPointerDown}
                            onPointerMove={onSigPointerMove}
                            onPointerUp={onSigPointerUp}
                            style={{
                              left: `${placement.x * 100}%`,
                              top: `${placement.y * 100}%`,
                              width: `${placement.width * 100}%`,
                            }}
                          >
                            <img alt="Your signature" draggable={false} src={signature} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        className="sign-placement__loading"
                        style={{ aspectRatio: String(pageAspect) }}
                      >
                        Rendering page…
                      </div>
                    )}
                  </div>
                </div>
  
                {signature && renderedPage && (
                  <label className="sign-size">
                    <span>Size</span>
                    <input
                      aria-valuetext={`${Math.round(placement.width * 100)}% of the page width`}
                      max={0.8}
                      min={0.1}
                      onChange={(event) =>
                        resizeSignature(Number(event.currentTarget.value))
                      }
                      step={0.01}
                      type="range"
                      value={placement.width}
                    />
                    <output>{Math.round(placement.width * 100)}%</output>
                  </label>
                )}

                <p className="sign-stage__hint">
                  {signature
                    ? 'Drag the signature to place it, then press Sign PDF.'
                    : 'Create a signature on the left, then drag it onto the page.'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
