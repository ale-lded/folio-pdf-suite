import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { SelectionNotice } from '../components/SelectionNotice'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import type { CompressionLevel } from '../lib/compressPdf'
import { addPdfFiles, formatFileSize } from '../lib/pdfFiles'

type CompressPageProps = {
  /** Quanti PDF sono selezionati: se più di uno, la pagina usa il primo. */
  selectedCount: number
  file: File | null
  onFileChange: (file: File | null) => void
  // Il livello vive in App: se la compressione fallisce e torniamo qui, resta
  // quello scelto.
  level: CompressionLevel
  onLevelChange: (level: CompressionLevel) => void
  onStart: (file: File, level: CompressionLevel) => void
  onBack: () => void
  compressError: string | null
}

const compressionLevels: {
  id: CompressionLevel
  title: string
  description: string
  detail: string
}[] = [
  {
    id: 'light',
    title: 'Light',
    description: 'Best quality, for printing',
    detail: '300 dpi',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'Recommended for sharing',
    detail: '150 dpi',
  },
  {
    id: 'strong',
    title: 'Strong',
    description: 'Smallest file, for screens',
    detail: '72 dpi',
  },
]

export function CompressPage({
  selectedCount,
  file,
  onFileChange,
  level,
  onLevelChange,
  onStart,
  onBack,
  compressError,
}: CompressPageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function chooseFile(fileList: FileList) {
    const result = addPdfFiles([], fileList)
    const [chosenFile] = result.added

    if (!chosenFile) {
      setError('Choose a PDF file that is no larger than 100 MB.')
      return
    }

    setError(
      fileList.length > 1
        ? `Compress works on one file at a time, so only "${chosenFile.name}" was added.`
        : null,
    )
    onFileChange(chosenFile)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer.files)
  }

  return (
    <section aria-labelledby="compress-title" className="workspace">
      <WorkspaceHeading
        description="Choose a PDF, then pick how much to shrink it."
        eyebrow="Smaller files, your choice of quality"
        icon="compress"
        onBack={onBack}
        title="Compress PDF"
        titleId="compress-title"
      />

      <div className="merge-layout">
        <div className="merge-files">
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
                <small>{formatFileSize(file.size)} · PDF</small>
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

          <SelectionNotice count={selectedCount} toolName="Compress" />

          {error && (
            <p className="form-message form-message--error" role="alert">
              {error}
            </p>
          )}
          {compressError && (
            <p className="form-message form-message--error" role="alert">
              {compressError}
            </p>
          )}
        </div>

        <aside aria-labelledby="compression-level-title" className="options compression">
          <h2 id="compression-level-title">Compression level</h2>
          <fieldset className="compression-levels">
            <legend className="visually-hidden">Choose compression level</legend>
            {compressionLevels.map((option) => (
              <label
                className={`compression-option${level === option.id ? ' compression-option--selected' : ''}`}
                key={option.id}
              >
                <input
                  checked={level === option.id}
                  name="compression-level"
                  onChange={() => onLevelChange(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span aria-hidden="true" className="compression-option__radio" />
                <span className="compression-option__copy">
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="compression-option__size">{option.detail}</span>
              </label>
            ))}
          </fieldset>

          <p className="field__hint">
            Compression runs on your device with a dedicated engine, so it's fast
            and your file stays private. The first time, your browser downloads
            the engine (about 11 MB); after that it keeps it in its cache and
            compression starts right away.
          </p>

          <p className="privacy-note">
            <Icon name="lock" size={14} />
            Your file stays on your device. Nothing is uploaded.
          </p>
          <button
            className="button button--primary merge-button"
            disabled={!file}
            onClick={() => {
              if (file) onStart(file, level)
            }}
            type="button"
          >
            Compress PDF
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
