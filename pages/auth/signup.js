import Link from 'next/link'
import Layout from '../../components/Layout'

export default function SignUp() {
  return (
    <Layout title="Sign up — fresh-web-lite">
      <h1>Sign up</h1>
      <form method="POST" action="/api/auth/signup">
        <label>
          Name
          <input name="name" type="text" />
        </label>
        <br />
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
        <button type="submit">Create account</button>
      </form>
      <p>
        Already have an account? <Link href="/auth/signin">Sign in</Link>
      </p>
    </Layout>
  )
}
