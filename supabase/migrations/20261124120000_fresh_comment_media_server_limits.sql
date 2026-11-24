-- Server-side limits for comment attachments.
--
-- Until now the 50 MiB and file-type limits were enforced only in the browser
-- (src/core/interactions/attachmentValidation.ts), so a modified client could upload
-- anything to the public comment-media bucket. This mirrors the client rules in the bucket
-- itself. It is deliberately NOT narrower than what the app sends today: the largest client
-- limit is 50 MiB (video), and the type list is the union of the client's accepted types plus
-- the picker's document types (.pdf, .txt, .doc, .docx).
--
-- Not applied by the engineer. The owner reviews and applies it. Existing objects are not
-- touched; the limits only apply to new uploads.
--
-- Rollback (restores the previous unlimited, any-type behaviour):
--   update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'comment-media';

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
where id = 'comment-media';
