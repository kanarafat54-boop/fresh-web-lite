const prisma = require('../../lib/prisma')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { authorId, postId, content, parentId } = req.body
  if (!authorId || !postId || !content) return res.status(400).json({ error: 'Missing fields' })

  const comment = await prisma.comment.create({ data: { authorId: parseInt(authorId), postId: parseInt(postId), content, parentId: parentId ? parseInt(parentId) : null } })
  res.json({ ok: true, comment })
}
