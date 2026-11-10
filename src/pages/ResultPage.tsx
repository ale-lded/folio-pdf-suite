import { Icon } from '../components/Icon'
import { downloadFile } from '../lib/downloadFile'

type ResultPageProps = {
  title: string
  description: string
  result: Blob | null
  downloadName: string
  downloadLabel: string
  retryLabel: string
  onRetry: () => void
  onHome: () => void
}

export function ResultPage({
  title,
  description,
  result,
  downloadName,
  downloadLabel,
  retryLabel,
  onRetry,
  onHome,
}: ResultPageProps) {
  return (
    <section aria-labelledby="result-title" className="center-state">
      <div className="result-card">
        <span aria-hidden="true" className="result-icon">
          <Icon name="check" size={28} />
        </span>
        <h1 id="result-title">{title}</h1>
        <p className="result-card__description">{description}</p>
        <div className="result-actions">
          <button
            className="button button--primary"
            disabled={!result}
            onClick={() => result && downloadFile(result, downloadName)}
            type="button"
          >
            {downloadLabel}
          </button>
          <button className="button button--secondary" onClick={onRetry} type="button">
            {retryLabel}
          </button>
          <button className="button button--ghost" onClick={onHome} type="button">
            All tools
          </button>
        </div>
      </div>
    </section>
  )
}
