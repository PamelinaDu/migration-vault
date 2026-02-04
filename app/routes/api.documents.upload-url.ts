import { createPresignedUploadUrl } from '../server/s3.server'
import type { Route } from '../+types/root'

function makeKey(filename: string) {
  const ts = Date.now()
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `documents/${ts}-${safe}`
}

export async function action({ request }: Route.ActionArgs) {
  const { filename, contentType, size } = (await request.json()) as {
    filename: string
    contentType: string
    size: number
  }

  if (!filename || !contentType || !size) {
    throw Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (size > 10 * 1024 * 1024) {
    throw Response.json({ error: 'Max 10MB' }, { status: 400 })
  }

  const key = makeKey(filename)
  const { uploadUrl } = await createPresignedUploadUrl({ key, contentType })

  return Response.json({ uploadUrl, key })
}
