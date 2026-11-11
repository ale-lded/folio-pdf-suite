import { author, contactEmail, hosting, licenseUrl, sourceUrl } from '../data/site'

type LegalPageProps = {
  onBack: () => void
  onLicenses: () => void
}

/**
 * Mentions légales (LCEN) e informativa privacy.
 *
 * Il sito è pubblicato da un privato, a titolo non professionale: la LCEN
 * permette di non pubblicare indirizzo e telefono personali, purché siano
 * stati comunicati all'hébergeur (account Cloudflare con nome e cognome veri).
 * Se Folio diventa parte di un'attività professionale (micro-entreprise),
 * questa pagina va aggiornata con i dati professionali: indirizzo, SIRET.
 *
 * Il testo sulla privacy descrive il comportamento reale dell'app: se un giorno
 * aggiungiamo analytics, cookie o un salvataggio nel browser, va aggiornato.
 */
export function LegalPage({ onBack, onLicenses }: LegalPageProps) {
  return (
    <section aria-labelledby="legal-title" className="info-page">
      <button className="back-link" onClick={onBack} type="button">
        <span aria-hidden="true" className="back-link__arrow">←</span>
        All tools
      </button>
      <article className="info-page__card">
        <p className="eyebrow">Folio PDF</p>
        <h1 id="legal-title">Legal notice</h1>
        <p lang="fr">Mentions légales</p>

        <h2>Publisher</h2>
        <p>
          Publisher and director of publication: {author.name}, a private
          individual publishing this free, non-commercial website in a personal
          capacity.
          {contactEmail && (
            <>
              <br />
              Contact: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </>
          )}
        </p>
        <p>
          As permitted by French law (LCEN) for non-professional publishers, the
          publisher's personal address and phone number are not published; they
          have been provided to the hosting provider.
        </p>

        {hosting && (
          <>
            <h2>Hosting</h2>
            <p>
              {hosting.name}
              <br />
              {hosting.address}
              <br />
              {hosting.contact}
            </p>
          </>
        )}

        <h2>Your files and your privacy</h2>
        <p>
          Every tool works entirely in your browser. Your PDFs, their content and
          the passwords you type are never uploaded, stored or seen by anyone:
          they stay on your device and disappear when you close the page.
        </p>
        <p>
          Folio PDF has no account, no cookies, no analytics and no advertising,
          and it saves nothing in your browser. The only things it downloads are
          its own files, including the compression engine, which your browser
          keeps in its cache.
        </p>
        <p>
          To deliver and protect the site, the hosting provider (Cloudflare)
          processes technical data such as IP addresses and request times. The
          publisher does not access or use this data. Cloudflare may process it
          outside the European Union, under the EU-U.S. Data Privacy Framework.
        </p>
        {contactEmail && (
          <p>
            For any question about your data, or to exercise your rights under
            the GDPR, write to{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        )}

        <h2>Liability</h2>
        <p>
          Folio PDF is provided free of charge and as is, without any warranty.
          Your original files are never modified, but always keep a copy of
          important documents before you process them.
        </p>

        <h2>Source code and licenses</h2>
        <p>
          Folio PDF is free software under the{' '}
          <a href={licenseUrl} rel="noreferrer" target="_blank">
            GNU AGPL v3
          </a>
          . Its{' '}
          <a href={sourceUrl} rel="noreferrer" target="_blank">
            source code
          </a>{' '}
          is public. The third-party software it uses is listed on the{' '}
          <button className="info-page__inline-link" onClick={onLicenses} type="button">
            Licenses
          </button>{' '}
          page.
        </p>
      </article>
    </section>
  )
}
