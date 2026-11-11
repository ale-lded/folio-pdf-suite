import { useEffect, useState } from 'react'
import { SiteHeader } from './components/SiteHeader'
import { CompressPage } from './pages/CompressPage'
import { HomePage } from './pages/HomePage'
import { MergePage } from './pages/MergePage'
import { ProgressPage } from './pages/ProgressPage'
import { ResultPage } from './pages/ResultPage'
import { SignPage } from './pages/SignPage'
import { SplitPage } from './pages/SplitPage'
import { ReorderPage } from './pages/ReorderPage'
import { ProtectPage } from './pages/ProtectPage'
import { ToolPlaceholder } from './pages/ToolPlaceholder'
import { LicensesPage } from './pages/LicensesPage'
import { LegalPage } from './pages/LegalPage'
import { author, sourceUrl } from './data/site'
import { mergePdfs } from './lib/mergePdfs'
import { splitPdf, type PageRange } from './lib/splitPdf'
import { reorderPdf } from './lib/reorderPdf'
import { signPdf, type SignPlacement } from './lib/signPdf'
import { zipPdfs } from './lib/zipPdfs'
import { protectPdf, type ProtectMode } from './lib/protectPdf'
import { unlockPdf } from './lib/unlockPdf'
import { compressPdf, type CompressionLevel } from './lib/compressPdf'
import { formatFileSize } from './lib/pdfFiles'
import type { Screen, ToolId } from './types'

type Theme = 'dark' | 'light'

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [screen, setScreen] = useState<Screen>('home')
  // Quale strumento ha prodotto il risultato: decide cosa mostrano le schermate
  // condivise "progress" e "result".
  const [lastRun, setLastRun] = useState<
    'merge' | 'split' | 'reorder' | 'sign' | 'protect' | 'compress'
  >('merge')

  const [files, setFiles] = useState<File[]>([])
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergedPdf, setMergedPdf] = useState<Blob | null>(null)

  const [splitFile, setSplitFile] = useState<File | null>(null)
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitZip, setSplitZip] = useState<Blob | null>(null)
  const [splitPartCount, setSplitPartCount] = useState(0)

  const [reorderFile, setReorderFile] = useState<File | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [reorderedPdf, setReorderedPdf] = useState<Blob | null>(null)

  const [signFile, setSignFile] = useState<File | null>(null)
  const [signError, setSignError] = useState<string | null>(null)
  const [signedPdf, setSignedPdf] = useState<Blob | null>(null)

  const [compressFile, setCompressFile] = useState<File | null>(null)
  const [compressLevel, setCompressLevel] =
    useState<CompressionLevel>('balanced')
  const [compressError, setCompressError] = useState<string | null>(null)
  const [compressedPdf, setCompressedPdf] = useState<Blob | null>(null)
  // Dimensioni prima e dopo, per mostrare il risparmio nel risultato.
  const [compressSizes, setCompressSizes] = useState({ before: 0, after: 0 })

  const [protectFile, setProtectFile] = useState<File | null>(null)
  const [protectMode, setProtectMode] = useState<ProtectMode>('add')
  const [protectError, setProtectError] = useState<string | null>(null)
  const [protectedPdf, setProtectedPdf] = useState<Blob | null>(null)

  // Screens share one scroll position, so a new one would open scrolled down.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen])

  const selectTool = (tool: ToolId) => setScreen(tool)

  async function startMerge(orderedFiles: File[]) {
    setLastRun('merge')
    setMergeError(null)
    setMergedPdf(null)
    setScreen('progress')

    try {
      const [mergedBytes] = await Promise.all([
        mergePdfs(orderedFiles),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const blob = new Blob([mergedBytes.slice()], { type: 'application/pdf' })
      setMergedPdf(blob)
      setScreen('result')
    } catch (error) {
      setMergeError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while merging your PDFs.',
      )
      setScreen('merge')
    }
  }

  async function startSplit(file: File, ranges: PageRange[]) {
    setLastRun('split')
    setSplitError(null)
    setSplitZip(null)
    setScreen('progress')

    try {
      // splitPdf valida i range e ritorna un PDF per intervallo; zipPdfs li
      // impacchetta in un unico archivio da scaricare.
      const [parts] = await Promise.all([
        splitPdf(file, ranges),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const zip = await zipPdfs(parts, file.name)
      setSplitPartCount(parts.length)
      setSplitZip(zip)
      setScreen('result')
    } catch (error) {
      setSplitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while splitting your PDF.',
      )
      setScreen('split')
    }
  }

  async function startReorder(file: File, order: number[]) {
    setLastRun('reorder')
    setReorderError(null)
    setReorderedPdf(null)
    setScreen('progress')

    try {
      const [reorderedBytes] = await Promise.all([
        reorderPdf(file, order),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const blob = new Blob([reorderedBytes.slice()], {
        type: 'application/pdf',
      })
      setReorderedPdf(blob)
      setScreen('result')
    } catch (error) {
      setReorderError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while reordering your PDF.',
      )
      setScreen('reorder')
    }
  }

  async function startSign(
    file: File,
    signaturePng: Uint8Array,
    placement: SignPlacement,
  ) {
    setLastRun('sign')
    setSignError(null)
    setSignedPdf(null)
    setScreen('progress')

    try {
      const [signedBytes] = await Promise.all([
        signPdf(file, signaturePng, placement),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const blob = new Blob([signedBytes.slice()], { type: 'application/pdf' })
      setSignedPdf(blob)
      setScreen('result')
    } catch (error) {
      setSignError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while signing your PDF.',
      )
      setScreen('sign')
    }
  }

  async function startCompress(file: File, level: CompressionLevel) {
    setLastRun('compress')
    setCompressError(null)
    setCompressedPdf(null)
    setScreen('progress')

    try {
      const [result] = await Promise.all([
        compressPdf(file, level),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const blob = new Blob([result.bytes.slice()], { type: 'application/pdf' })
      setCompressSizes({
        before: result.originalSize,
        after: result.compressedSize,
      })
      setCompressedPdf(blob)
      setScreen('result')
    } catch (error) {
      setCompressError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while compressing your PDF.',
      )
      setScreen('compress')
    }
  }

  async function startProtect(
    file: File,
    mode: ProtectMode,
    password: string,
  ) {
    setLastRun('protect')
    setProtectError(null)
    setProtectedPdf(null)
    setScreen('progress')

    try {
      const [protectedBytes] = await Promise.all([
        mode === 'add' ? protectPdf(file, password) : unlockPdf(file, password),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ])

      const blob = new Blob([protectedBytes.slice()], {
        type: 'application/pdf',
      })
      setProtectedPdf(blob)
      setScreen('result')
    } catch (error) {
      setProtectError(
        error instanceof Error
          ? error.message
          : mode === 'add'
            ? 'Something went wrong while protecting your PDF.'
            : 'Something went wrong while removing the password.',
      )
      setScreen('protect')
    }
  }

  const splitStem = splitFile ? splitFile.name.replace(/\.pdf$/i, '') : 'split'
  const reorderStem = reorderFile
    ? reorderFile.name.replace(/\.pdf$/i, '')
    : 'reordered'
  const signStem = signFile ? signFile.name.replace(/\.pdf$/i, '') : 'signed'
  const compressStem = compressFile
    ? compressFile.name.replace(/\.pdf$/i, '')
    : 'compressed'
  const compressSaving =
    compressSizes.before > 0
      ? Math.round((1 - compressSizes.after / compressSizes.before) * 100)
      : 0
  const protectStem = protectFile
    ? protectFile.name.replace(/\.pdf$/i, '')
    : 'protected'

  return (
    <div className="app" data-theme={theme}>
      <SiteHeader
        onHome={() => setScreen('home')}
        onToggleTheme={() =>
          setTheme((currentTheme) =>
            currentTheme === 'dark' ? 'light' : 'dark',
          )
        }
        theme={theme}
      />
      <main className="page-container" id="main-content">
        {screen === 'home' ? (
          <HomePage
            files={files}
            onFilesChange={setFiles}
            onSelectTool={selectTool}
          />
        ) : screen === 'merge' ? (
          <MergePage
            files={files}
            onFilesChange={(nextFiles) => {
              setFiles(nextFiles)
              setMergeError(null)
            }}
            onBack={() => {
              setScreen('home')
              setMergeError(null)
            }}
            onStart={startMerge}
            mergeError={mergeError}
          />
        ) : screen === 'split' ? (
          <SplitPage
            file={splitFile}
            onFileChange={(file) => {
              setSplitFile(file)
              setSplitError(null)
            }}
            onBack={() => {
              setScreen('home')
              setSplitError(null)
            }}
            onStart={startSplit}
            splitError={splitError}
          />
        ) : screen === 'reorder' ? (
          <ReorderPage
            file={reorderFile}
            onFileChange={(file) => {
              setReorderFile(file)
              setReorderError(null)
            }}
            onBack={() => {
              setScreen('home')
              setReorderError(null)
            }}
            onStart={startReorder}
            reorderError={reorderError}
          />
        ) : screen === 'compress' ? (
          <CompressPage
            compressError={compressError}
            file={compressFile}
            level={compressLevel}
            onBack={() => {
              setScreen('home')
              setCompressError(null)
            }}
            onFileChange={(file) => {
              setCompressFile(file)
              setCompressError(null)
            }}
            onLevelChange={(level) => {
              setCompressLevel(level)
              setCompressError(null)
            }}
            onStart={startCompress}
          />
        ) : screen === 'sign' ? (
          <SignPage
            file={signFile}
            onFileChange={(file) => {
              setSignFile(file)
              setSignError(null)
            }}
            onBack={() => {
              setScreen('home')
              setSignError(null)
            }}
            onStart={startSign}
            signError={signError}
          />
        ) : screen === 'protect' ? (
          <ProtectPage
            file={protectFile}
            onFileChange={(file) => {
              setProtectFile(file)
              setProtectError(null)
            }}
            onBack={() => {
              setScreen('home')
              setProtectError(null)
            }}
            mode={protectMode}
            onModeChange={(mode) => {
              setProtectMode(mode)
              setProtectError(null)
            }}
            onStart={startProtect}
            protectError={protectError}
          />
        ) : screen === 'licenses' ? (
          <LicensesPage onBack={() => setScreen('home')} />
        ) : screen === 'legal' ? (
          <LegalPage
            onBack={() => setScreen('home')}
            onLicenses={() => setScreen('licenses')}
          />
        ) : screen === 'progress' ? (
          lastRun === 'compress' ? (
            <ProgressPage
              description="Shrinking your PDF on your device. The first time, the compression engine is downloaded once, so it can take a little longer."
              icon="compress"
              title="Compressing your PDF"
            />
          ) : lastRun === 'protect' ? (
            protectMode === 'add' ? (
              <ProgressPage
                description="Encrypting your PDF on your device. Your password never leaves it."
                icon="protect"
                title="Protecting your PDF"
              />
            ) : (
              <ProgressPage
                description="Decrypting your PDF on your device. Your password never leaves it."
                icon="protect"
                title="Removing the password"
              />
            )
          ) : lastRun === 'split' ? (
            <ProgressPage
              description="Dividing the pages on your device. Large files can take a while."
              icon="split"
              title="Splitting your PDF"
            />
          ) : lastRun === 'reorder' ? (
            <ProgressPage
              description="Rebuilding the PDF in its new order on your device."
              icon="reorder"
              title="Reordering your PDF"
            />
          ) : lastRun === 'sign' ? (
            <ProgressPage
              description="Stamping your signature into the page on your device."
              icon="sign"
              title="Signing your PDF"
            />
          ) : (
            <ProgressPage
              description={`Combining ${files.length} ${
                files.length === 1 ? 'file' : 'files'
              } on your device. Large files can take a while.`}
              icon="merge"
              title="Merging your PDFs"
            />
          )
        ) : screen === 'result' ? (
          lastRun === 'compress' ? (
            <ResultPage
              description={`${formatFileSize(compressSizes.before)} → ${formatFileSize(
                compressSizes.after,
              )} · ${compressSaving}% smaller`}
              downloadLabel="Download PDF"
              downloadName={`${compressStem}-compressed.pdf`}
              onHome={() => {
                setCompressedPdf(null)
                setScreen('home')
              }}
              onRetry={() => {
                setCompressedPdf(null)
                setScreen('compress')
              }}
              result={compressedPdf}
              retryLabel="Back to compress"
              title="Your PDF is smaller"
            />
          ) : lastRun === 'protect' ? (
            <ResultPage
              description={`${
                protectMode === 'add' ? 'Password-protected' : 'Password removed'
              }${
                protectedPdf ? ` · ${formatFileSize(protectedPdf.size)}` : ''
              }`}
              downloadLabel="Download PDF"
              downloadName={`${protectStem}-${
                protectMode === 'add' ? 'protected' : 'unlocked'
              }.pdf`}
              onHome={() => {
                setProtectedPdf(null)
                setScreen('home')
              }}
              onRetry={() => {
                setProtectedPdf(null)
                setScreen('protect')
              }}
              result={protectedPdf}
              retryLabel="Back to protect"
              title={
                protectMode === 'add'
                  ? 'Your PDF is protected'
                  : 'Your PDF is unlocked'
              }
            />
          ) : lastRun === 'split' ? (
            <ResultPage
              description={`${splitPartCount} ${
                splitPartCount === 1 ? 'file' : 'files'
              }${splitZip ? ` · ${formatFileSize(splitZip.size)}` : ''}`}
              downloadLabel="Download ZIP"
              downloadName={`${splitStem}-split.zip`}
              onHome={() => {
                setSplitZip(null)
                setScreen('home')
              }}
              onRetry={() => {
                setSplitZip(null)
                setScreen('split')
              }}
              result={splitZip}
              retryLabel="Back to split"
              title="Your files are ready"
            />
          ) : lastRun === 'reorder' ? (
            <ResultPage
              description={`Reordered${
                reorderedPdf ? ` · ${formatFileSize(reorderedPdf.size)}` : ''
              }`}
              downloadLabel="Download PDF"
              downloadName={`${reorderStem}-reordered.pdf`}
              onHome={() => {
                setReorderedPdf(null)
                setScreen('home')
              }}
              onRetry={() => {
                setReorderedPdf(null)
                setScreen('reorder')
              }}
              result={reorderedPdf}
              retryLabel="Back to reorder"
              title="Your PDF is ready"
            />
          ) : lastRun === 'sign' ? (
            <ResultPage
              description={`Signed${
                signedPdf ? ` · ${formatFileSize(signedPdf.size)}` : ''
              }`}
              downloadLabel="Download PDF"
              downloadName={`${signStem}-signed.pdf`}
              onHome={() => {
                setSignedPdf(null)
                setScreen('home')
              }}
              onRetry={() => {
                setSignedPdf(null)
                setScreen('sign')
              }}
              result={signedPdf}
              retryLabel="Back to sign"
              title="Your PDF is ready"
            />
          ) : (
            <ResultPage
              description={`${files.length} files merged${
                mergedPdf ? ` · ${formatFileSize(mergedPdf.size)}` : ''
              }`}
              downloadLabel="Download PDF"
              downloadName="merged.pdf"
              onHome={() => {
                setMergedPdf(null)
                setScreen('home')
              }}
              onRetry={() => {
                setMergedPdf(null)
                setScreen('merge')
              }}
              result={mergedPdf}
              retryLabel="Back to merge"
              title="Your PDF is ready"
            />
          )
        ) : (
          <ToolPlaceholder
            onBack={() => setScreen('home')}
            tool={screen}
          />
        )}
      </main>
      <footer className="site-footer">
        <span>
          Folio PDF <span aria-hidden="true">·</span> private by design
        </span>
        <span aria-hidden="true">·</span>
        <nav aria-label="About Folio PDF" className="site-footer__links">
          <a
            className="site-footer__link"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Source code (AGPL-3.0)
          </a>
          <span aria-hidden="true">·</span>
          <button
            className="site-footer__link"
            onClick={() => setScreen('licenses')}
            type="button"
          >
            Licenses
          </button>
          <span aria-hidden="true">·</span>
          <button
            className="site-footer__link"
            onClick={() => setScreen('legal')}
            type="button"
          >
            Legal notice
          </button>
          <span aria-hidden="true">·</span>
          <a
            className="site-footer__link site-footer__link--author"
            href={author.url}
            rel="noreferrer"
            target="_blank"
          >
            Made by {author.name} ↗
          </a>
        </nav>
      </footer>
    </div>
  )
}
