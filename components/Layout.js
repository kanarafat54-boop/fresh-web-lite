import Head from 'next/head'
import Link from 'next/link'
import React from 'react'

export default function Layout({ children, title = 'fresh-web-lite', description = 'Lightweight Next.js PWA scaffold with Prisma, workers, and Capacitor support' }) {
  const fullTitle = title + ' · fresh-web-lite'
  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        <meta name="theme-color" content="#ffcc00" />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div className="site">
        <header style={{ padding: 16, borderBottom: '1px solid #eee' }}>
          <nav style={{ display: 'flex', gap: 12 }}>
            <Link href="/">Home</Link>
            <Link href="/feed">Feed</Link>
            <Link href="/auth/signin">Sign in</Link>
            <Link href="/auth/signup">Sign up</Link>
          </nav>
        </header>
        <main style={{ padding: 16 }}>{children}</main>
        <footer style={{ padding: 16, borderTop: '1px solid #eee', marginTop: 24 }}>
          <small>© {new Date().getFullYear()} fresh-web-lite</small>
        </footer>
      </div>
    </>
  )
}
