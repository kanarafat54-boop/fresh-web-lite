import './MemphisArafatPage.css'

const links = [
  { label: 'Fresh Web Lite', href: '/' },
  { label: 'GitHub', href: 'https://github.com/kanarafat54-boop' },
  { label: 'Instagram', href: 'https://www.instagram.com/arafatmemphis/' },
]

export default function MemphisArafatPage() {
  return (
    <main className="memphis-page">
      <section className="memphis-hero">
        <div className="memphis-mark">M</div>
        <p className="memphis-eyebrow">CREATOR · BUILDER · FOUNDER</p>
        <h1>Memphis Arafat</h1>
        <p className="memphis-lead">
          Creator of Fresh Web Lite — building a connected platform for identity,
          intelligence, creation, and digital ownership.
        </p>
        <div className="memphis-links">
          {links.map((link) => (
            <a key={link.label} href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noreferrer' : undefined}>
              {link.label}
            </a>
          ))}
        </div>
      </section>

      <section className="memphis-section">
        <h2>About Memphis Arafat</h2>
        <p>
          Memphis Arafat is an independent software creator focused on AI-native
          computing, connected digital experiences, and the Fresh Web Lite vision.
        </p>
      </section>

      <section className="memphis-section">
        <h2>Fresh Web Lite</h2>
        <p>
          Fresh Web Lite is a connected platform concept bringing identity,
          intelligence, creation, social experiences, and digital ownership into
          one evolving ecosystem.
        </p>
        <a className="memphis-project-link" href="https://github.com/kanarafat54-boop/fresh-web-lite" target="_blank" rel="noreferrer">
          View the project on GitHub →
        </a>
      </section>
    </main>
  )
}
