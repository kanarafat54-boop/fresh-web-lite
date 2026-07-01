const prisma = require('../../../lib/prisma')
const bcrypt = require('bcryptjs')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'User already exists' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name: name || null, email, password: hashed }
    })

    const safe = { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
    return res.status(201).json({ ok: true, user: safe })
  } catch (err) {
    console.error('signup error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
