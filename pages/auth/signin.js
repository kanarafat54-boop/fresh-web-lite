import Link from 'next/link'
import Layout from '../../components/Layout'

export default function SignIn() {
  return (
    <Layout title="Sign in — fresh-web-lite">
      <h1>Sign in</h1>
      <form method="POST" action="/api/auth/signin">
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <br />
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <br />
        <button type="submit">Sign in</button>
      </form>
      <p>
        No account? <Link href="/auth/signup">Sign up</Link>
      </p>
    </Layout>
  )
}
