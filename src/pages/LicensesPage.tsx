import {
  author,
  components,
  copyrightYear,
  licenseUrl,
  sourceUrl,
  thirdPartyLicensesUrl,
} from '../data/site'

type LicensesPageProps = {
  onBack: () => void
}

export function LicensesPage({ onBack }: LicensesPageProps) {
  return (
    <section aria-labelledby="licenses-title" className="info-page">
      <button className="back-link" onClick={onBack} type="button">
        <span aria-hidden="true" className="back-link__arrow">←</span>
        All tools
      </button>
      <article className="info-page__card">
        <p className="eyebrow">Folio PDF</p>
        <h1 id="licenses-title">Licenses</h1>

        <p>
          Folio PDF is free software, released under the{' '}
          <a href={licenseUrl} rel="noreferrer" target="_blank">
            GNU Affero General Public License v3
          </a>
          . You can read, change and share{' '}
          <a href={sourceUrl} rel="noreferrer" target="_blank">
            the source code of this exact version
          </a>
          , including the scripts that build its WebAssembly engines.
        </p>
        {/* Gli "avvisi legali appropriati" che l'AGPL (sezioni 0 e 5) chiede
            a un programma interattivo: copyright, assenza di garanzia e dove
            leggere la licenza. */}
        <p>
          Copyright © {copyrightYear} {author.name}. This program comes with
          absolutely no warranty, to the extent permitted by law. It is free
          software, and you are welcome to redistribute it under the terms of
          the AGPL v3.
        </p>

        <h2>Built with</h2>
        <ul className="info-page__list">
          {components.map((component) => (
            <li key={component.name}>
              <span>
                <a href={component.url} rel="noreferrer" target="_blank">
                  {component.name}
                </a>
                <small>{component.role}</small>
              </span>
              <span className="info-page__tag">{component.license}</span>
            </li>
          ))}
        </ul>

        <p>
          These and every other library the site sends to your browser are
          listed, with the full text of their licenses and copyright notices, in{' '}
          <a href={thirdPartyLicensesUrl} rel="noreferrer" target="_blank">
            third-party-licenses.txt
          </a>
          .
        </p>
      </article>
    </section>
  )
}
