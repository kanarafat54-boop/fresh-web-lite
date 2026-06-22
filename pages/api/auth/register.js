const bcrypt = require('bcryptjs')
const prisma = require('../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, name, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(400).json({ error: 'User already exists' })

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, name: name || null, password: hash } })
  res.status(201).json({ id: user.id, email: user.email })
}
