import { useEffect } from 'react'
import './MemphisArafatPage.css'

const links = [
  { label: 'Fresh Tech', href: '/fresh-tech' },
  { label: 'Fresh Web Lite', href: '/' },
  { label: 'GitHub', href: 'https://github.com/kanarafat54-boop' },
  { label: 'Instagram', href: 'https://www.instagram.com/arafatmemphis/' },
]

const focusAreas = [
  { title: 'Artificial intelligence', description: 'Building toward useful, grounded AI systems, research and intelligent tools.' },
  { title: 'Connected technology', description: 'Bringing software, identity, services and digital experiences into coherent systems.' },
  { title: 'Media and creation', description: 'Exploring tools for people to create, publish, communicate and share.' },
  { title: 'Markets and digital value', description: 'Developing ideas around digital finance, ownership and connected commerce.' },
  { title: 'Automation and machines', description: 'Researching how software, agents and physical systems can work together responsibly.' },
  { title: 'Learning and discovery', description: 'Turning questions, evidence and experimentation into practical progress.' },
]

export default function MemphisArafatPage() {
  useEffect(() => {
    document.title = 'Memphis Arafat | Founder & CEO of Fresh Tech'
    const description = 'Memphis Arafat is Founder & CEO of Fresh Tech, building connected technology across AI, software, media, markets and automation.'
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = 'https://fresh-web-lite.vercel.app/memphis-arafat'
    let schema = document.getElementById('memphis-person-schema') as HTMLScriptElement | null
    if (!schema) {
      schema = document.createElement('script')
      schema.id = 'memphis-person-schema'
      schema.type = 'application/ld+json'
      document.head.appendChild(schema)
    }
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Memphis Arafat',
      jobTitle: 'Founder & CEO',
      worksFor: { '@type': 'Organization', name: 'Fresh Tech', url: 'https://fresh-web-lite.vercel.app/fresh-tech' },
      url: 'https://fresh-web-lite.vercel.app/memphis-arafat',
      sameAs: ['https://github.com/kanarafat54-boop', 'https://www.instagram.com/arafatmemphis/'],
      description,
    })
    return () => {
      schema?.remove()
    }
  }, [])

  return (
    <main className="memphis-page">
      <nav className="memphis-topbar" aria-label="Profile navigation">
        <a className="memphis-wordmark" href="/">FRESH TECH<span> / ARA6</span></a>
        <a className="memphis-toplink" href="/fresh-tech">Explore Fresh Tech <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="memphis-hero">
        <div className="memphis-hero-copy">
          <p className="memphis-eyebrow">FOUNDER & CEO <span>·</span> FRESH TECH</p>
          <h1>Memphis<br /><span>Arafat.</span></h1>
          <p className="memphis-lead">I build technology with a long view — turning ideas into systems across artificial intelligence, connected software, media, markets and automation.</p>
          <p className="memphis-signature">Building as <strong>Ara6</strong>.</p>
          <div className="memphis-links">
            {links.map((link) => (
              <a key={link.label} href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                {link.label}{link.href.startsWith('http') ? <span aria-hidden="true"> ↗</span> : null}
              </a>
            ))}
          </div>
        </div>
        <aside className="memphis-hero-aside" aria-label="Professional identity">
          <span className="memphis-aside-index">01 / IDENTITY</span>
          <div className="memphis-monogram">M<span>A</span></div>
          <p>Ideas into systems.<br />Systems into possibility.</p>
          <span className="memphis-aside-footer">FRESH TECH · ARA6</span>
        </aside>
      </section>

      <section className="memphis-intro">
        <p className="memphis-section-label">01 — ABOUT</p>
        <div>
          <h2>Building beyond a single product.</h2>
          <p>Memphis Arafat is a technology founder and independent builder focused on creating connected systems that can grow across products, industries and real-world use. His work is guided by curiosity, practical experimentation and the belief that ambitious ideas should be translated into useful technology.</p>
          <p>Fresh Tech is the wider technology vision. Fresh Web Lite is one way to access and experience that work — not the limit of what Fresh Tech is intended to become.</p>
        </div>
      </section>

      <section className="memphis-focus">
        <div className="memphis-focus-heading">
          <p className="memphis-section-label">02 — AREAS OF FOCUS</p>
          <h2>One vision.<br /><span>Many frontiers.</span></h2>
        </div>
        <div className="memphis-focus-grid">
          {focusAreas.map((area, index) => (
            <article className="memphis-focus-card" key={area.title}>
              <span>0{index + 1}</span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="memphis-work">
        <p className="memphis-section-label">03 — CURRENT WORK</p>
        <div>
          <h2>From vision to working systems.</h2>
          <p><strong>Fresh Tech</strong> is the broader initiative connecting the long-term direction.</p>
          <p><strong>Fresh Web Lite</strong> is an evolving web access point for connected digital experiences, including Fresh Flow and Fresh AI.</p>
          <p><strong>Ara6</strong> is the builder identity and technology direction behind the work.</p>
          <a className="memphis-primary-link" href="/fresh-tech">Explore the Fresh Tech vision <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <footer className="memphis-footer">
        <a href="/">Fresh Tech <span>·</span> Ara6</a>
        <p>Turn ideas into systems.</p>
        <span>© {new Date().getFullYear()} Memphis Arafat</span>
      </footer>
    </main>
  )
}
