const prisma = require('../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { userId, postId } = req.body
  if (!userId || !postId) return res.status(400).json({ error: 'Missing fields' })

  const existing = await prisma.like.findFirst({ where: { userId: parseInt(userId), postId: parseInt(postId) } })
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } })
    return res.json({ ok: true, action: 'unliked' })
  }

  const like = await prisma.like.create({ data: { userId: parseInt(userId), postId: parseInt(postId) } })
  res.json({ ok: true, like })
}
