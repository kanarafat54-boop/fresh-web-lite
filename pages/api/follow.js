const prisma = require('../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { followerId, followingId } = req.body
  if (!followerId || !followingId) return res.status(400).json({ error: 'Missing fields' })

  // Prevent duplicates
  const exists = await prisma.follow.findFirst({ where: { followerId: parseInt(followerId), followingId: parseInt(followingId) } })
  if (exists) {
    // Optionally allow unfollow
    await prisma.follow.delete({ where: { id: exists.id } })
    return res.json({ ok: true, action: 'unfollow' })
  }

  const follow = await prisma.follow.create({ data: { followerId: parseInt(followerId), followingId: parseInt(followingId) } })
  res.json({ ok: true, follow })
}
