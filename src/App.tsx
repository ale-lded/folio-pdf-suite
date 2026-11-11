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
import { ToolPlaceholder } from './pages/ToolPlaceholder'
import { mergePdfs } from './lib/mergePdfs'
import { splitPdf, type PageRange } from './lib/splitPdf'
import { reorderPdf } from './lib/reorderPdf'
import { zipPdfs } from './lib/zipPdfs'
import { formatFileSize } from './lib/pdfFiles'
import type { Screen, ToolId } from './types'

type Theme = 'dark' | 'light'

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [screen, setScreen] = useState<Screen>('home')
  // Quale strumento ha prodotto il risultato: decide cosa mostrano le schermate
  // condivise "progress" e "result".
  const [lastRun, setLastRun] = useState<'merge' | 'split' | 'reorder'>('merge')

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

  const splitStem = splitFile ? splitFile.name.replace(/\.pdf$/i, '') : 'split'
  const reorderStem = reorderFile
    ? reorderFile.name.replace(/\.pdf$/i, '')
    : 'reordered'

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
          <CompressPage onBack={() => setScreen('home')} />
        ) : screen === 'sign' ? (
          <SignPage onBack={() => setScreen('home')} />
        ) : screen === 'progress' ? (
          lastRun === 'split' ? (
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
          lastRun === 'split' ? (
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
        Folio PDF <span aria-hidden="true">·</span> private by design
      </footer>
    </div>
  )
}
