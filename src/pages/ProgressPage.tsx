import { Icon, type IconName } from '../components/Icon'

type ProgressPageProps = {
  title: string
  description: string
  icon: IconName
}

export function ProgressPage({ title, description, icon }: ProgressPageProps) {
  return (
    <section aria-labelledby="progress-title" className="center-state">
      <div aria-live="polite" className="process-card" role="status">
        <span className="process-icon">
          <Icon name={icon} size={26} />
        </span>
        <h1 id="progress-title">{title}</h1>
        <p className="process-card__description">{description}</p>
        <div aria-label={title} className="progress-track" role="progressbar">
          <span className="progress-track__loop" />
        </div>
      </div>
    </section>
  )
}
