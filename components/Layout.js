import Head from 'next/head'
import Link from 'next/link'
import React from 'react'

export default function Layout({ children, title = 'fresh-web-lite' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
