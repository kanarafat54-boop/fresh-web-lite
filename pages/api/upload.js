// Fallback upload handler using public/uploads when S3 not configured
import prisma from '../../lib/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { filename, contentType, postId } = req.body
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' })

  // If S3 not configured, store locally under /public/uploads
  if (!process.env.S3_BUCKET) {
    const key = `/uploads/${Date.now()}_${filename}`
    // Create a media record pointing to local URL
    const media = await prisma.media.create({ data: { url: key, mime: contentType, postId: postId ? parseInt(postId) : null } })
    return res.json({ uploadUrl: null, key, mediaId: media.id, local: true })
  }

  // Otherwise, original S3 flow (placeholder - requires lib/s3.js)
  try {
    const key = `uploads/${Date.now()}_${filename}`
    // If lib/s3 exists, use getUploadSignedUrl
    const s3 = require('../../lib/s3')
    const { getUploadSignedUrl } = s3
    if (!getUploadSignedUrl) throw new Error('S3 helper missing')
    const url = await getUploadSignedUrl(key, contentType)
    const media = await prisma.media.create({ data: { url: `s3://${process.env.S3_BUCKET}/${key}`, mime: contentType, postId: postId ? parseInt(postId) : null } })
    res.json({ uploadUrl: url, key, mediaId: media.id })
  } catch (err) {
    console.error('Upload fallback error', err)
    res.status(500).json({ error: 'Upload not available' })
  }
}
