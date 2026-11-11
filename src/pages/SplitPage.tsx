import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Icon } from '../components/Icon'
import { SelectionNotice } from '../components/SelectionNotice'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { addPdfFiles, formatFileSize } from '../lib/pdfFiles'
import type { PageRange } from '../lib/splitPdf'

type SplitMode = 'every-page' | 'every-n' | 'custom'

type SplitPageProps = {
  /** Quanti PDF sono selezionati: se più di uno, la pagina usa il primo. */
  selectedCount: number
  file: File | null
  onFileChange: (file: File | null) => void
  onStart: (file: File, ranges: PageRange[]) => void
  onBack: () => void
  splitError: string | null
}

export function SplitPage({
  selectedCount,
  file,
  onFileChange,
  onStart,
  onBack,
  splitError,
}: SplitPageProps) {
  const [mode, setMode] = useState<SplitMode>('every-page')
  const [pagesPerPart, setPagesPerPart] = useState(2)
  const [customRanges, setCustomRanges] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pageCount, setPageCount] = useState<number | null>(null)

  // Leggere quante pagine ha il PDF richiede di aprirlo con pdf-lib: è
  // asincrono, quindi lo facciamo appena il file cambia e salviamo il numero
  // nello stato, pronto per "every page" / "every N".
  useEffect(() => {
    if (!file) {
      setPageCount(null)
      return
    }

    let cancelled = false

    file
      .arrayBuffer()
      .then((bytes) => PDFDocument.load(bytes))
      .then((pdf) => {
        if (!cancelled) setPageCount(pdf.getPageCount())
      })
      .catch(() => {
        if (!cancelled) {
          setPageCount(null)
          setError(`"${file.name}" could not be read. It may be damaged or not a real PDF.`)
        }
      })

    // Se il file cambia di nuovo prima che la lettura finisca, ignoriamo il
    // risultato vecchio così non sovrascrive quello nuovo.
    return () => {
      cancelled = true
    }
  }, [file])

  function chooseFile(fileList: FileList) {
    // Same checks as merge (PDF only, size limit), on a list that starts empty.
    const result = addPdfFiles([], fileList)
    const [chosenFile] = result.added

    if (!chosenFile) {
      setError('Choose a PDF file that is no larger than 100 MB.')
      return
    }

    setError(
      fileList.length > 1
        ? `Split works on one file at a time, so only "${chosenFile.name}" was added.`
        : null,
    )
    onFileChange(chosenFile)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer.files)
  }

  function getRanges(): PageRange[] {
    if (mode === 'custom') {
      // "1-3, 5, 8-10" -> [{1,3}, {5,5}, {8,10}].
      // Non validiamo qui: splitPdf controlla già numeri, limiti e ordine e
      // lancia errori chiari, quindi ci limitiamo a tradurre il testo.
      return customRanges
        .split(',')
        .map((piece) => piece.trim())
        .filter((piece) => piece !== '')
        .map((piece) => {
          if (piece.includes('-')) {
            const [start, end] = piece.split('-')
            return { start: Number(start), end: Number(end) }
          }
          const single = Number(piece)
          return { start: single, end: single }
        })
    }

    // "every page" / "every N" hanno bisogno del totale pagine. Se non è ancora
    // pronto (lettura in corso o file illeggibile) restituiamo una lista vuota:
    // splitPdf dirà "Choose at least one range of pages to split."
    if (pageCount === null) {
      return []
    }

    if (mode === 'every-page') {
      // Un file per pagina: 1-1, 2-2, ... N-N.
      const ranges: PageRange[] = []
      for (let page = 1; page <= pageCount; page++) {
        ranges.push({ start: page, end: page })
      }
      return ranges
    }

    // mode === 'every-n': blocchi da N. Con N=2 e 5 pagine -> 1-2, 3-4, 5-5.
    // Math.max(1, ...) evita il ciclo infinito se il campo è vuoto o < 1.
    const step = Math.max(1, Math.floor(pagesPerPart))
    const ranges: PageRange[] = []
    for (let start = 1; start <= pageCount; start += step) {
      const end = Math.min(start + step - 1, pageCount)
      ranges.push({ start, end })
    }
    return ranges
  }

  return (
    <section aria-labelledby="split-title" className="workspace">
      <WorkspaceHeading
        description="Choose a PDF, then decide how to divide its pages."
        eyebrow="One file in, several files out"
        icon="split"
        onBack={onBack}
        title="Split PDF"
        titleId="split-title"
      />

      <div className="merge-layout">
        <div className="merge-files">
          {/* La dropzone resta sempre visibile; il file scelto appare sotto. */}
          <div
            className={`upload-box${isDragging ? ' upload-box--active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()
              setIsDragging(true)
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

          {file && (
            <div className="file-row file-row--standalone">
              <span aria-hidden="true" className="file-row__icon">
                <Icon name="file" size={18} />
              </span>
              <span className="file-row__details">
                <strong>{file.name}</strong>
                <small>
                  {formatFileSize(file.size)} · PDF
                  {pageCount !== null &&
                    ` · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}
                </small>
              </span>
              <div className="file-row__actions">
                <button
                  aria-label={`Remove ${file.name}`}
                  className="icon-button icon-button--remove"
                  onClick={() => {
                    onFileChange(null)
                    setError(null)
                  }}
                  type="button"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          )}

          <SelectionNotice count={selectedCount} toolName="Split" />

          {error && (
            <p className="form-message form-message--error" role="alert">
              {error}
            </p>
          )}
          {splitError && (
            <p className="form-message form-message--error" role="alert">
              {splitError}
            </p>
          )}
        </div>

        <aside aria-label="Split options" className="options">
          <div className="options__heading">
            <h2>Split settings</h2>
            <p>
              {!file
                ? 'Choose a PDF to begin'
                : pageCount === null
                  ? 'Reading the PDF…'
                  : `${pageCount} ${
                      pageCount === 1 ? 'page' : 'pages'
                    } ready to divide`}
            </p>
          </div>
          <div className="options__divider" />

          <div className="field">
            <label className="field__label" htmlFor="split-mode">
              How to divide
            </label>
            <select
              className="field__select"
              id="split-mode"
              onChange={(event) => setMode(event.currentTarget.value as SplitMode)}
              value={mode}
            >
              <option value="every-page">One file per page</option>
              <option value="every-n">Every N pages</option>
              <option value="custom">Custom ranges</option>
            </select>
          </div>

          {mode === 'every-n' && (
            <div className="field">
              <label className="field__label" htmlFor="split-n">
                Pages per file
              </label>
              <input
                className="field__input"
                id="split-n"
                min={1}
                onChange={(event) =>
                  setPagesPerPart(Number(event.currentTarget.value))
                }
                type="number"
                value={pagesPerPart}
              />
            </div>
          )}

          {mode === 'custom' && (
            <div className="field">
              <label className="field__label" htmlFor="split-ranges">
                Page ranges
              </label>
              <input
                className="field__input"
                id="split-ranges"
                onChange={(event) => setCustomRanges(event.currentTarget.value)}
                placeholder="1-3, 5, 8-10"
                type="text"
                value={customRanges}
              />
              <small className="field__hint">
                Separate ranges with commas. Each one becomes its own file.
              </small>
            </div>
          )}

          <div className="options__divider" />
          <p className="privacy-note">
            <Icon name="lock" size={14} />
            Your file stays on your device. Nothing is uploaded.
          </p>

          <button
            className="button button--primary merge-button"
            disabled={!file}
            onClick={() => {
              if (file) {
                onStart(file, getRanges())
              }
            }}
            type="button"
          >
            Split PDF
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
