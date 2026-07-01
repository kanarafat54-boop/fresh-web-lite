import Head from 'next/head'
import Layout from '../components/Layout'

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "fresh-web-lite",
    "url": "https://github.com/kanarafat54-boop/fresh-web-lite",
    "description": "A lightweight, SEO-friendly Next.js PWA scaffold and monorepo starter for web and mobile.",
  }

  return (
    <Layout>
      <Head>
        <link rel="icon" href="/icons/icon-192.svg" />
        <meta property="og:image" content="/og-image.svg" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <h1>fresh-web-lite</h1>
      <p>Monorepo aggregator and starter scaffold.</p>
      <nav style={{ display: 'flex', gap: 12 }}>
        <a href="/feed">Feed</a>
        <a href="/auth/signin">Sign in</a>
        <a href="/auth/signup">Sign up</a>
      </nav>
    </Layout>
  )
}
