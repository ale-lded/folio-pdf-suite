import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { SelectionNotice } from '../components/SelectionNotice'
import { WorkspaceHeading } from '../components/WorkspaceHeading'
import { addPdfFiles, formatFileSize } from '../lib/pdfFiles'
import type { ProtectMode } from '../lib/protectPdf'

type ProtectPageProps = {
  /** Quanti PDF sono selezionati: se più di uno, la pagina usa il primo. */
  selectedCount: number
  file: File | null
  onFileChange: (file: File | null) => void
  // La modalità vive in App: se l'operazione fallisce e torniamo qui, la
  // pagina riparte nella stessa modalità invece che in "add".
  mode: ProtectMode
  onModeChange: (mode: ProtectMode) => void
  onStart: (file: File, mode: ProtectMode, password: string) => void
  onBack: () => void
  protectError: string | null
}

type SwitchRowProps = {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SwitchRow({ label, hint, checked, onChange }: SwitchRowProps) {
  return (
    <div className="toggle-row field">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <button
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? ' switch--on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span />
      </button>
    </div>
  )
}

export function ProtectPage({
  selectedCount,
  file,
  onFileChange,
  mode,
  onModeChange,
  onStart,
  onBack,
  protectError,
}: ProtectPageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // Mostriamo l'avviso solo quando la conferma è stata scritta, non mentre
  // l'utente sta ancora digitando la prima password.
  const isAdding = mode === 'add'
  const passwordsDiffer =
    isAdding && confirmPassword !== '' && confirmPassword !== password
  // Per togliere la password ne basta una, e può anche essere vuota: i PDF con
  // sole restrizioni si aprono senza password.
  const canStart =
    file !== null &&
    (!isAdding || (password !== '' && confirmPassword === password))

  function chooseFile(fileList: FileList) {
    const result = addPdfFiles([], fileList)
    const [chosenFile] = result.added

    if (!chosenFile) {
      setError('Choose a PDF file that is no larger than 100 MB.')
      return
    }

    setError(
      fileList.length > 1
        ? `Protect works on one file at a time, so only "${chosenFile.name}" was added.`
        : null,
    )
    onFileChange(chosenFile)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer.files)
  }

  function start() {
    if (!file || !canStart) return

    onStart(file, mode, password)
  }

  function changeMode(nextMode: ProtectMode) {
    // Una password scritta per aggiungere non è quella del file da sbloccare:
    // ripartiamo da campi vuoti.
    setPassword('')
    setConfirmPassword('')
    onModeChange(nextMode)
  }

  const passwordType = showPasswords ? 'text' : 'password'

  return (
    <section aria-labelledby="protect-title" className="workspace">
      <WorkspaceHeading
        description="Choose a PDF, then add a password or remove the one it has."
        eyebrow="Encrypted with AES-256"
        icon="protect"
        onBack={onBack}
        title="Protect PDF"
        titleId="protect-title"
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

          <SelectionNotice count={selectedCount} toolName="Protect" />

          {error && (
            <p className="form-message form-message--error" role="alert">
              {error}
            </p>
          )}
          {protectError && (
            <p className="form-message form-message--error" role="alert">
              {protectError}
            </p>
          )}
        </div>

        <aside aria-label="Protect options" className="options">
          <div className="options__heading">
            <h2>Password</h2>
            <p>
              {!file
                ? 'Choose a PDF to begin'
                : isAdding
                  ? 'Anyone who opens the file will need it'
                  : 'The file will open without a password'}
            </p>
          </div>
          <div className="options__divider" />

          <div className="field">
            <label className="field__label" htmlFor="protect-mode">
              What to do
            </label>
            <select
              className="field__select"
              id="protect-mode"
              onChange={(event) =>
                changeMode(event.currentTarget.value as ProtectMode)
              }
              value={mode}
            >
              <option value="add">Add a password</option>
              <option value="remove">Remove a password</option>
            </select>
          </div>

          {/* Il form permette di confermare con Invio e dice ai password
              manager se la password è nuova o già esistente. */}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              start()
            }}
          >
            <div className="field">
              <label className="field__label" htmlFor="protect-password">
                {isAdding ? 'Password to open' : 'Current password'}
              </label>
              <input
                autoComplete={isAdding ? 'new-password' : 'current-password'}
                className="field__input"
                id="protect-password"
                onChange={(event) => setPassword(event.currentTarget.value)}
                type={passwordType}
                value={password}
              />
              {!isAdding && (
                <small className="field__hint">
                  Leave it empty if the file opens without a password but
                  can't be printed or copied.
                </small>
              )}
            </div>

            {isAdding && (
              <div className="field">
                <label className="field__label" htmlFor="protect-confirm">
                  Repeat password
                </label>
                <input
                  aria-describedby={passwordsDiffer ? 'protect-confirm-hint' : undefined}
                  aria-invalid={passwordsDiffer}
                  autoComplete="new-password"
                  className="field__input"
                  id="protect-confirm"
                  onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                  type={passwordType}
                  value={confirmPassword}
                />
                {passwordsDiffer && (
                  <small className="field__hint field__hint--error" id="protect-confirm-hint">
                    The passwords don't match.
                  </small>
                )}
              </div>
            )}

            <SwitchRow
              checked={showPasswords}
              hint="Check what you typed"
              label={isAdding ? 'Show passwords' : 'Show password'}
              onChange={setShowPasswords}
            />

            <div className="options__divider" />
            <p className="privacy-note">
              <Icon name="lock" size={14} />
              Your file and password stay on your device. Nothing is uploaded.
            </p>

            <button
              className="button button--primary merge-button"
              disabled={!canStart}
              type="submit"
            >
              {isAdding ? 'Protect PDF' : 'Remove password'}
              <Icon name="arrow" size={17} />
            </button>
          </form>
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
