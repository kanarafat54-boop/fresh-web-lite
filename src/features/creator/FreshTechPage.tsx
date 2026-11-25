import { useEffect } from 'react'
import './FreshTechPage.css'

const pillars = [
  ['Artificial intelligence', 'Fresh AI, intelligent systems, research and the foundations for future model capabilities.'],
  ['Digital platforms', 'Connected products and services that make technology easier to access and use.'],
  ['Finance and markets', 'Exploration across digital value, financial tools, commerce and market infrastructure.'],
  ['Media and creation', 'Experiences and tools for publishing, communication, entertainment and creative work.'],
  ['Automation and machines', 'Software agents, workflow automation and research toward responsible machine interaction.'],
  ['Knowledge and discovery', 'Systems for learning, evidence, research and turning information into useful action.'],
]

export default function FreshTechPage() {
  useEffect(() => {
    document.title = 'Fresh Tech | Built by Ara6'
    const description = 'Fresh Tech is a broader technology initiative built by Ara6, exploring AI, connected platforms, finance, media, automation and knowledge systems.'
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
    canonical.href = 'https://fresh-web-lite.vercel.app/fresh-tech'

    const setProperty = (property: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('property', property)
        document.head.appendChild(tag)
      }
      tag.content = content
    }
    setProperty('og:type', 'website')
    setProperty('og:title', 'Fresh Tech | Built by Ara6')
    setProperty('og:description', description)
    setProperty('og:url', 'https://fresh-web-lite.vercel.app/fresh-tech')

    let schema = document.getElementById('fresh-tech-schema') as HTMLScriptElement | null
    if (!schema) {
      schema = document.createElement('script')
      schema.id = 'fresh-tech-schema'
      schema.type = 'application/ld+json'
      document.head.appendChild(schema)
    }
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Fresh Tech',
      url: 'https://fresh-web-lite.vercel.app/fresh-tech',
      founder: { '@type': 'Person', name: 'Memphis Arafat', jobTitle: 'Founder & CEO' },
      description,
    })
    return () => schema?.remove()
  }, [])

  return (
    <main className="fresh-tech-page">
      <header className="ft-nav">
        <a href="/" className="ft-brand">FRESH TECH <span>BY ARA6</span></a>
        <a href="/memphis-arafat">Memphis Arafat <span aria-hidden="true">↗</span></a>
      </header>
      <section className="ft-hero">
        <p className="ft-kicker">A TECHNOLOGY VISION BUILT BY ARA6</p>
        <h1>Technology<br /><span>without narrow borders.</span></h1>
        <p>Fresh Tech is a long-term technology initiative exploring how intelligence, software, digital value, media, knowledge and automation can work together.</p>
        <div className="ft-hero-actions">
          <a href="/memphis-arafat">Meet the founder</a>
          <a href="/">Explore Fresh Web Lite</a>
        </div>
        <div className="ft-hero-note"><span>THE PRINCIPLE</span><strong>Turn ideas into systems.</strong></div>
      </section>
      <section className="ft-about">
        <p className="ft-kicker">01 — THE BIGGER PICTURE</p>
        <div><h2>More than one website.<br />More than one product.</h2><p>Fresh Tech is the wider direction behind a growing set of technology efforts. Each product can serve a distinct purpose while contributing to a connected vision. Fresh Web Lite is one access channel into that work — alongside future and developing work across AI, digital finance, media, markets and automation.</p></div>
      </section>
      <section className="ft-pillars">
        <p className="ft-kicker">02 — TECHNOLOGY AREAS</p>
        <div className="ft-pillar-grid">{pillars.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <section className="ft-platform">
        <p className="ft-kicker">03 — AN ACCESS POINT</p>
        <div><h2>Fresh Web Lite</h2><p>Fresh Web Lite is an evolving web-based access point connecting experiences such as Fresh Flow and Fresh AI. It is part of the wider Fresh Tech direction, not a claim that every future capability is already complete.</p><a href="/">Visit Fresh Web Lite <span aria-hidden="true">→</span></a></div>
      </section>
      <footer className="ft-footer"><a href="/memphis-arafat">Founder & CEO: Memphis Arafat</a><span>Built by Ara6 · © {new Date().getFullYear()} Fresh Tech</span></footer>
    </main>
  )
}
