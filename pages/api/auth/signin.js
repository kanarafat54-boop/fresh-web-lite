const prisma = require('../../../lib/prisma')
const bcrypt = require('bcryptjs')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const safe = { id: user.id, email: user.email, name: user.name }
    return res.status(200).json({ ok: true, user: safe })
  } catch (err) {
    console.error('signin error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
