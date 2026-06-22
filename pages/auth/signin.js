import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Layout from '../../components/Layout'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const res = await signIn('credentials', { redirect: false, email, password })
    if (res?.ok) {
      setMsg('Signed in')
      window.location.href = '/'
    } else {
      setMsg(res?.error || 'Sign in failed')
    }
  }

  return (
    <Layout>
      <h3>Sign in</h3>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
        </div>
        <button type="submit">Sign in</button>
      </form>
      <p>Or <a href="/api/auth/signin">use NextAuth providers</a></p>
      {msg && <p>{msg}</p>}
    </Layout>
  )
}
