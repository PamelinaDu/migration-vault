import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useFetcher, useLoaderData } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { createPresignedUploadUrl } from '../server/s3.server'

type DocItem = {
  id: string
  name: string
  uploadedAt: string
  status: 'Uploaded'
  key: string
}

type LoaderData = { documents: DocItem[] }

export async function loader(_: LoaderFunctionArgs): Promise<LoaderData> {
  return { documents: [] }
}

type ActionData =
  | { ok: true; uploadUrl: string; key: string; name: string }
  | { ok: false; error: string }

export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  const formData = await request.formData()
  const name = String(formData.get('name') ?? '')
  const contentType = String(formData.get('contentType') ?? '')

  if (!name) return { ok: false, error: 'Missing file name.' }
  if (contentType !== 'application/pdf') {
    return { ok: false, error: 'Only PDF files are allowed for now.' }
  }

  const safeName = name.replace(/[^\w.\-() ]+/g, '').replace(/\s+/g, '_')
  const key = `documents/${crypto.randomUUID()}-${safeName}`

  const { uploadUrl } = await createPresignedUploadUrl({ key, contentType })
  return { ok: true, uploadUrl, key, name }
}

export default function DocumentsPage() {
  const { documents } = useLoaderData() as LoaderData
  const fetcher = useFetcher<ActionData>()

  const pendingFileRef = useRef<File | null>(null)
  const [uploadingToS3, setUploadingToS3] = useState(false)

  useEffect(() => {
    const data = fetcher.data
    if (!data) return

    if (!data.ok) {
      console.log(data.error)
      pendingFileRef.current = null
      return
    }

    const file = pendingFileRef.current
    if (!file) return
    ;(async () => {
      try {
        setUploadingToS3(true)

        const putRes = await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        })
        console.log('S3 PUT response', putRes)

        if (!putRes.ok) {
          const text = await putRes.text()
          console.error('S3 PUT failed', putRes.status, text)
          console.log(
            `Upload failed (${putRes.status}). Check console/network.`,
          )
          return
        }

        console.log('Uploaded ✅ (Next: save in DB + refresh list)')
      } finally {
        setUploadingToS3(false)
        pendingFileRef.current = null
      }
    })()
  }, [fetcher.data])

  function onFilePicked(file: File) {
    if (file.type !== 'application/pdf') {
      console.log('Only PDF files are allowed.')
      return
    }

    pendingFileRef.current = file

    const form = new FormData()
    form.set('name', file.name)
    form.set('contentType', file.type)

    fetcher.submit(form, { method: 'post', action: '/documents' })
  }

  const isRequestingPresign = fetcher.state !== 'idle'
  const isBusy = isRequestingPresign || uploadingToS3

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="px-4 py-2 border rounded-md text-sm font-medium">
            {isBusy ? 'Uploading...' : 'Upload document'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={isBusy}
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              onFilePicked(file)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-medium border-b">
          <div className="col-span-6">Name</div>
          <div className="col-span-3">Uploaded date</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {documents.length === 0 ? (
          <div className="px-4 py-6 text-sm opacity-80">No documents yet.</div>
        ) : (
          <ul>
            {documents.map(d => (
              <li
                key={d.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-b-0"
              >
                <div className="col-span-6">{d.name}</div>
                <div className="col-span-3">{d.uploadedAt}</div>
                <div className="col-span-2">{d.status}</div>
                <div className="col-span-1 text-right opacity-60">—</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isBusy && <div className="text-sm opacity-70">Uploading…</div>}
    </div>
  )
}
