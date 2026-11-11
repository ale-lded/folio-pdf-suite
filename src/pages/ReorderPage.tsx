import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { addPdfFiles } from '../lib/pdfFiles'
import { usePdfThumbnails } from '../lib/usePdfThumbnails'

type ReorderPageProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  onStart: (file: File, order: number[]) => void
  onBack: () => void
  reorderError: string | null
}

export function ReorderPage({
  file,
  onFileChange,
  onStart,
  onBack,
  reorderError,
}: ReorderPageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // `order` è la sequenza di indici di pagina (0-based) nello stato attuale.
  // Parte da [0, 1, 2, …] e il trascinamento la rimescola.
  const [order, setOrder] = useState<number[]>([])

  // Lettura + rendering delle pagine (pageCount subito, miniature a seguire).
  const { status, pageCount, thumbs } = usePdfThumbnails(file)

  // Drag di una tessera: posizione trascinata e posizione sotto il cursore.
  const [draggedAt, setDraggedAt] = useState<number | null>(null)
  const [dropTargetAt, setDropTargetAt] = useState<number | null>(null)

  // Appena il numero di pagine è noto, inizializzo l'ordine a quello naturale.
  // Dipende anche da `file` così due PDF con lo stesso numero di pagine si
  // reinizializzano comunque.
  useEffect(() => {
    setOrder(
      pageCount > 0
        ? Array.from({ length: pageCount }, (_, index) => index)
        : [],
    )
  }, [pageCount, file])

  function chooseFile(fileList: FileList) {
    const result = addPdfFiles([], fileList)
    const [chosenFile] = result.added

    if (!chosenFile) {
      setError('Choose a PDF file that is no larger than 100 MB.')
      return
    }

    setError(
      fileList.length > 1
        ? `Reorder works on one file at a time, so only "${chosenFile.name}" was added.`
        : null,
    )
    onFileChange(chosenFile)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer.files)
  }

  // Sposta una tessera dalla posizione `from` alla posizione `to` dentro `order`.
  function moveTileTo(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) {
      return
    }

    const next = [...order]
    const [moved] = next.splice(from, 1)

    if (moved !== undefined) {
      next.splice(to, 0, moved)
      setOrder(next)
    }
  }

  function removeTileAt(position: number) {
    setOrder(order.filter((_, index) => index !== position))
  }

  function resetRowDrag() {
    setDraggedAt(null)
    setDropTargetAt(null)
  }

  const isReady = pageCount > 0 && order.length > 0
  const isChanged =
    pageCount > 0 &&
    (order.length !== pageCount ||
      order.some((pageIndex, position) => pageIndex !== position))

  return (
    <section aria-labelledby="reorder-title" className="workspace">
      <WorkspaceHeading
        description="Choose a PDF, then drag its pages into the order you want."
        eyebrow="Rearrange, or drop pages you don't need"
        icon="reorder"
        onBack={onBack}
        title="Reorder pages"
        titleId="reorder-title"
      />

      <div className="merge-layout">
        <div className="merge-files">
          {/* La dropzone resta sempre visibile; le pagine appaiono sotto. */}
          <div
            className={`upload-box${isDragging ? ' upload-box--active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()

              if (event.dataTransfer.types.includes('Files')) {
                setIsDragging(true)
              }
            }}
            onDragLeave={(event) => {
              const nextTarget = event.relatedTarget

              if (
                !(nextTarget instanceof Node) ||
                !event.currentTarget.contains(nextTarget)
              ) {
                setIsDragging(false)
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
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
                  chooseFile(event.currentTarget.files)
                  event.currentTarget.value = ''
                }
              }}
              ref={inputRef}
              type="file"
            />
          </div>

          {error && (
            <p className="form-message form-message--error" role="alert">
              {error}
            </p>
          )}
          {reorderError && (
            <p className="form-message form-message--error" role="alert">
              {reorderError}
            </p>
          )}

          {file && (
            <>
              <div className="file-list-heading">
                <div>
                  <h2>Your pages</h2>
                  <p>Drag a page to move it. Use the × to drop one you don't need.</p>
                </div>
              </div>

              {status === 'error' ? (
                <div className="file-empty-state">
                  <span className="icon-disc">
                    <Icon name="file" />
                  </span>
                  <strong>Couldn't read this PDF</strong>
                  <p>It may be damaged, password-protected or not a real PDF.</p>
                </div>
              ) : pageCount === 0 ? (
                <div className="file-empty-state">
                  <span className="icon-disc">
                    <Icon name="file" />
                  </span>
                  <strong>Reading the PDF…</strong>
                  <p>Counting its pages.</p>
                </div>
              ) : order.length === 0 ? (
                <div className="file-empty-state">
                  <span className="icon-disc">
                    <Icon name="file" />
                  </span>
                  <strong>No pages left</strong>
                  <p>Reset to bring them all back.</p>
                </div>
              ) : (
                <ol aria-label="Pages in their new order" className="page-grid">
                  {order.map((pageIndex, position) => (
                    <li
                      className={[
                        'page-tile',
                        draggedAt === position && 'page-tile--dragging',
                        dropTargetAt === position &&
                          draggedAt !== position &&
                          'page-tile--drop-target',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      draggable
                      key={pageIndex}
                      onDragEnd={resetRowDrag}
                      onDragOver={(event) => {
                        if (draggedAt === null) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        setDropTargetAt(position)
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', String(position))
                        setDraggedAt(position)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedAt !== null) {
                          moveTileTo(draggedAt, position)
                        }
                        resetRowDrag()
                      }}
                    >
                      <button
                        aria-label={`Remove page ${pageIndex + 1}`}
                        className="page-tile__remove"
                        onClick={() => removeTileAt(position)}
                        type="button"
                      >
                        <Icon name="close" size={14} />
                      </button>
                      <span className="page-tile__thumb">
                        {thumbs[pageIndex] ? (
                          <img
                            alt=""
                            className="page-tile__img"
                            draggable={false}
                            src={thumbs[pageIndex] ?? undefined}
                          />
                        ) : (
                          <span className="page-tile__thumb-wait" aria-hidden="true" />
                        )}
                      </span>
                      <span className="page-tile__label">
                        Page {pageIndex + 1}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        <aside aria-label="Reorder options" className="options">
          <div className="options__heading">
            <h2>Reorder pages</h2>
            <p>
              {!file
                ? 'Choose a PDF to begin'
                : status === 'error'
                  ? "Couldn't read this PDF"
                  : pageCount === 0
                    ? 'Reading the PDF…'
                    : `${order.length} of ${pageCount} ${
                        pageCount === 1 ? 'page' : 'pages'
                      } kept`}
            </p>
          </div>
          <div className="options__divider" />

          <div className="reorder-actions">
            <button
              className="button button--secondary"
              disabled={!isReady}
              onClick={() => setOrder([...order].reverse())}
              type="button"
            >
              Reverse
            </button>
            <button
              className="button button--ghost"
              disabled={pageCount === null || !isChanged}
              onClick={() =>
                pageCount !== null &&
                setOrder(Array.from({ length: pageCount }, (_, index) => index))
              }
              type="button"
            >
              Reset
            </button>
          </div>

          <div className="options__divider" />
          <p className="privacy-note">
            <Icon name="lock" size={14} />
            Your file stays on your device. Nothing is uploaded.
          </p>

          <button
            className="button button--primary merge-button"
            disabled={!file || !isReady}
            onClick={() => {
              if (file && isReady) {
                onStart(file, order)
              }
            }}
            type="button"
          >
            Reorder PDF
            <Icon name="arrow" size={17} />
          </button>
          <button
            className="button button--ghost clear-button"
            disabled={!file}
            onClick={() => {
              onFileChange(null)
              setError(null)
            }}
            type="button"
          >
            Clear
          </button>
        </aside>
      </div>
    </section>
  )
}
