/** Informazioni sul sito usate da footer, Licenses e Legal notice. */

export const repositoryUrl = 'https://github.com/ale-lded/animationPdfTools'

/** Il codice esatto di questa versione del sito (vedi __APP_COMMIT__ in vite.config.ts). */
export const sourceUrl = `${repositoryUrl}/tree/${__APP_COMMIT__}`

export const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`

export const thirdPartyLicensesUrl = `${import.meta.env.BASE_URL}third-party-licenses.txt`

export const author = {
  name: 'Alessio Mura',
  url: 'https://alessiomura.fr',
}

/**
 * Email pubblicata nelle mentions légales come contatto diretto.
 * DA COMPILARE con l'indirizzo dedicato scelto dall'autore.
 */
export const contactEmail: string | null = null

/** Anno di inizio del copyright, per gli avvisi richiesti dall'AGPL. */
export const copyrightYear = 2026

/**
 * Hébergeur, obbligatorio nelle mentions légales (LCEN, art. 6): il sito è
 * pubblicato su Cloudflare Pages. Se cambia l'hosting, va aggiornato.
 */
export const hosting: { name: string; address: string; contact: string } | null = {
  name: 'Cloudflare, Inc. (Cloudflare Pages)',
  address: '101 Townsend St, San Francisco, CA 94107, United States',
  contact: '+1 (650) 319-8930 · cloudflare.com',
}

export type ThirdPartyComponent = {
  name: string
  role: string
  license: string
  url: string
}

/** I componenti principali, mostrati nella pagina Licenses. */
export const components: ThirdPartyComponent[] = [
  {
    name: 'Ghostscript',
    role: 'Compression engine (WebAssembly)',
    license: 'AGPL-3.0',
    url: 'https://github.com/ArtifexSoftware/ghostpdl',
  },
  {
    name: 'qpdf',
    role: 'Password protection engine (WebAssembly)',
    license: 'Apache-2.0',
    url: 'https://github.com/qpdf/qpdf',
  },
  {
    name: 'pdf-lib',
    role: 'Merge, split, reorder and sign',
    license: 'MIT',
    url: 'https://github.com/Hopding/pdf-lib',
  },
  {
    name: 'PDF.js',
    role: 'Page previews',
    license: 'Apache-2.0',
    url: 'https://github.com/mozilla/pdf.js',
  },
  {
    name: 'JSZip',
    role: 'ZIP downloads',
    license: 'MIT',
    url: 'https://github.com/Stuk/jszip',
  },
  {
    name: 'React',
    role: 'Interface',
    license: 'MIT',
    url: 'https://github.com/facebook/react',
  },
]
