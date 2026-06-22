import Link from 'next/link'
import Layout from '../components/Layout'

export default function Home() {
  return (
    <Layout>
      <h1>fresh-web-lite</h1>
      <p>Monorepo aggregator and starter scaffold.</p>
      <nav style={{ display: 'flex', gap: 12 }}>
        <Link href="/feed">Feed</Link>
        <Link href="/auth/signin">Sign in</Link>
        <Link href="/auth/signup">Sign up</Link>
      </nav>
    </Layout>
  )
}
