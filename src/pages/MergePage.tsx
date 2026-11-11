import { useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { addPdfFiles, formatFileSize, maxFiles, maxTotalSize } from '../lib/pdfFiles'
import { usePointerSort } from '../lib/usePointerSort'

type SortMode = 'manual' | 'name' | 'date'

type MergePageProps = {
  files: File[]
  onFilesChange: (files: File[]) => void
  onStart: (files: File[]) => void
  onBack: () => void
  mergeError: string | null
}


export function MergePage({
  files,
  onFilesChange,
  onStart,
  onBack,
  mergeError,
}: MergePageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const canReorder = sortMode === 'manual'

  const visibleFiles = useMemo(() => {
    if (sortMode === 'name') {
      return [...files].sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortMode === 'date') {
      return [...files].sort((a, b) => b.lastModified - a.lastModified)
    }

    return files
  }, [files, sortMode])

  const totalSize = files.reduce((total, file) => total + file.size, 0)
  const isOverFileCount = files.length > maxFiles
  const isOverTotalSize = totalSize > maxTotalSize

  function addFiles(fileList: FileList | File[]) {
    const result = addPdfFiles(files, fileList)

    if (result.rejected.length > 0) {
      setError(
        'Some files were skipped. Choose PDF files that are no larger than 100 MB each.',
      )
    } else {
      setError(null)
    }

    if (result.added.length > 0) {
      onFilesChange(result.files)
      setSortMode('manual')
    }
  }

  function moveFileTo(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      toIndex < 0 ||
      toIndex >= files.length
    ) {
      return
    }

    const nextFiles = [...files]
    const [movedFile] = nextFiles.splice(fromIndex, 1)

    if (movedFile) {
      nextFiles.splice(toIndex, 0, movedFile)
    }

    onFilesChange(nextFiles)
    setSortMode('manual')
  }

  function moveFile(index: number, offset: -1 | 1) {
    moveFileTo(index, index + offset)
  }

  // Trascinamento con mouse, dito o penna (sul telefono: pressione prolungata).
  // Solo in ordine manuale: con un ordinamento attivo le righe non si spostano.
  const { drag, itemProps, dragStyle } = usePointerSort(moveFileTo)

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  return (
    <section aria-labelledby="merge-title" className="workspace">
      <WorkspaceHeading
        description="Select files from your device, then arrange them before you continue."
        eyebrow="Put everything in the right order"
        icon="merge"
        onBack={onBack}
        title="Merge PDFs"
        titleId="merge-title"
      />

      <div className="merge-layout">
        <div className="merge-files">
          <div
            className={`upload-box${isDragging ? ' upload-box--active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()

              // Only highlight for files coming from the device, not for list rows.
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
              <Icon name="upload" size={24} />
            </span>
            <div>
              <strong>Drop PDFs here</strong>
              <p>or select files from your device</p>
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
              aria-label="Choose PDF files"
              className="visually-hidden"
              multiple
              onChange={(event) => {
                if (event.currentTarget.files) {
                  addFiles(event.currentTarget.files)
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
          {mergeError && (
            <p className="form-message form-message--error" role="alert">
              {mergeError}
            </p>
          )}



          <div className="file-list-heading">
            <div>
              <h2>Your files</h2>
              <p>Use the arrows to set the final order. Up to 20 files, 600 MB in total.</p>
            </div>
            {files.length > 0 && (
              <label className="sort-control">
                <span>Sort</span>
                <select
                  aria-label="Sort PDF files"
                  onChange={(event) =>
                    setSortMode(
                      event.currentTarget.value === 'name'
                        ? 'name'
                        : event.currentTarget.value === 'date'
                          ? 'date'
                          : 'manual',
                    )
                  }
                  value={sortMode}
                >
                  <option value="manual">Manual order</option>
                  <option value="name">Name A–Z</option>
                  <option value="date">File date</option>
                </select>
              </label>
            )}
          </div>

          {files.length === 0 ? (
            <div className="file-empty-state">
              <span className="icon-disc">
                <Icon name="file" />
              </span>
              <strong>No PDFs selected yet</strong>
              <p>Add two or more files to prepare a merge.</p>
            </div>
          ) : (
            <ol aria-label="PDF merge order" className="file-list">
              {visibleFiles.map((file, index) => (
                <li
                  {...(canReorder ? itemProps(index) : {})}
                  className={[
                    'file-row',
                    canReorder && 'file-row--draggable',
                    drag?.from === index && 'file-row--dragging',
                    drag?.over === index &&
                      drag.from !== index &&
                      'file-row--drop-target',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={`${file.name}-${file.lastModified}-${index}`}
                  style={dragStyle(index)}
                >
                  <span className="file-row__number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true" className="file-row__icon">
                    <Icon name="file" size={18} />
                  </span>
                  <span className="file-row__details">
                    <strong>{file.name}</strong>
                    <small>{formatFileSize(file.size)} · PDF</small>
                  </span>
                  <div className="file-row__actions">
                    <button
                      aria-label={`Move ${file.name} up`}
                      className="icon-button icon-button--move"
                      disabled={index === 0 || sortMode !== 'manual'}
                      onClick={() => moveFile(index, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${file.name} down`}
                      className="icon-button icon-button--move"
                      disabled={
                        index === visibleFiles.length - 1 || sortMode !== 'manual'
                      }
                      onClick={() => moveFile(index, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      aria-label={`Remove ${file.name}`}
                      className="icon-button icon-button--remove"
                      onClick={() => {
                        onFilesChange(
                          files.filter((candidate) => candidate !== file),
                        )
                        setError(null)
                      }}
                      type="button"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside aria-label="Merge options" className="options">
          <div className="options__heading">
            <h2>Ready to merge</h2>
            <p>
              {files.length} {files.length === 1 ? 'file' : 'files'}
              {files.length > 0 && <> · {formatFileSize(totalSize)}</>}
            </p>
          </div>
          <div className="options__divider" />
          <p className="privacy-note">
            <Icon name="lock" size={14} />
            Your files stay on your device. Nothing is uploaded.
          </p>
          {isOverFileCount && (
            <p className="form-message form-message--error" role="alert">
              You have {files.length} files. The limit is {maxFiles}, so remove
              at least {files.length - maxFiles} to continue.
            </p>
          )}
          {isOverTotalSize && (
            <p className="form-message form-message--error" role="alert">
              Your files total {formatFileSize(totalSize)}. The limit is 600 MB,
              so remove at least {formatFileSize(totalSize - maxTotalSize)} to
              continue.
            </p>
          )}
          <button
            className="button button--primary merge-button"
            disabled={files.length < 2 || isOverFileCount || isOverTotalSize}
            onClick={() => onStart(visibleFiles)}
            type="button"
          >
            Merge PDFs
            <Icon name="arrow" size={17} />
          </button>
          <button
            className="button button--ghost clear-button"
            disabled={files.length === 0}
            onClick={() => {
              onFilesChange([])
              setError(null)
            }}
            type="button"
          >
            Clear all
          </button>
        </aside>
      </div>
    </section>
  )
}
