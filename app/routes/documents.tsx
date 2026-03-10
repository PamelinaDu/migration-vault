import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useFetcher, useLoaderData, useRevalidator } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { desc } from 'drizzle-orm'
import { createPresignedUploadUrl } from '../server/s3.server'
import { db } from '~/database/server'
import { documents as documentsSch } from '~/database/schema'

type DocItem = {
  id: string
  name: string
  uploadedAt: string
  status: 'Uploaded'
  key: string
}

type LoaderData = { documents: DocItem[] }

export async function loader(_: LoaderFunctionArgs): Promise<LoaderData> {
  const rows = await db
    .select({
      id: documentsSch.id,
      originalName: documentsSch.originalName,
      title: documentsSch.title,
      createdAt: documentsSch.createdAt,
      key: documentsSch.s3Key,
    })
    .from(documentsSch)
    .orderBy(desc(documentsSch.createdAt))

  return {
    documents: rows.map(row => ({
      id: row.id,
      name: row.originalName ?? row.title,
      uploadedAt: new Date(row.createdAt).toISOString().slice(0, 10),
      status: 'Uploaded',
      key: row.key,
    })),
  }
}

type ActionData =
  | { ok: true; step: 'presign'; uploadUrl: string; key: string; name: string }
  | { ok: true; step: 'saved'; id: string }
  | { ok: false; error: string }

export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? 'presign')

  if (intent === 'presign') {
    const name = String(formData.get('name') ?? '')
    const contentType = String(formData.get('contentType') ?? '')

    if (!name) return { ok: false, error: 'Missing file name.' }
    if (contentType !== 'application/pdf') {
      return { ok: false, error: 'Only PDF files are allowed for now.' }
    }

    const safeName = name.replace(/[^\w.\-() ]+/g, '').replace(/\s+/g, '_')
    const key = `documents/${crypto.randomUUID()}-${safeName}`
    const { uploadUrl } = await createPresignedUploadUrl({ key, contentType })
    return { ok: true, step: 'presign', uploadUrl, key, name }
  }

  if (intent === 'save') {
    const name = String(formData.get('name') ?? '')
    const key = String(formData.get('key') ?? '')
    const contentType = String(formData.get('contentType') ?? '')
    const sizeBytesRaw = String(formData.get('sizeBytes') ?? '')

    if (!name || !key || !contentType || !sizeBytesRaw) {
      return { ok: false, error: 'Missing fields to save document.' }
    }

    const sizeBytesNumber = Number.parseInt(sizeBytesRaw, 10)
    if (!Number.isFinite(sizeBytesNumber) || sizeBytesNumber < 0) {
      return { ok: false, error: 'Invalid file size.' }
    }

    const title = name.replace(/\.[^.]+$/, '') || name
    const [inserted] = await db
      .insert(documentsSch)
      .values({
        title,
        type: 'pdf',
        notes: null,
        s3Key: key,
        originalName: name,
        contentType,
        sizeBytes: String(sizeBytesNumber),
      })
      .returning({ id: documentsSch.id })

    return { ok: true, step: 'saved', id: inserted.id }
  }

  return { ok: false, error: 'Unknown intent.' }
}

export default function DocumentsPage() {
  const { documents } = useLoaderData() as LoaderData
  const presignFetcher = useFetcher<ActionData>()
  const saveFetcher = useFetcher<ActionData>()
  const revalidator = useRevalidator()

  const pendingFileRef = useRef<File | null>(null)
  const lastUploadedKeyRef = useRef<string | null>(null)
  const [uploadingToS3, setUploadingToS3] = useState(false)

  useEffect(() => {
    const data = presignFetcher.data
    if (!data) return

    if (!data.ok) {
      console.error(data.error)
      pendingFileRef.current = null
      return
    }

    if (data.step !== 'presign') return
    if (lastUploadedKeyRef.current === data.key) return
    lastUploadedKeyRef.current = data.key

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

        if (!putRes.ok) {
          const text = await putRes.text()
          console.error('S3 PUT failed', putRes.status, text)
          console.log(`Upload failed (${putRes.status}). Check console/network.`)
          return
        }

        const saveForm = new FormData()
        saveForm.set('intent', 'save')
        saveForm.set('name', data.name)
        saveForm.set('key', data.key)
        saveForm.set('contentType', file.type)
        saveForm.set('sizeBytes', String(file.size))

        saveFetcher.submit(saveForm, { method: 'post', action: '/documents' })
      } finally {
        setUploadingToS3(false)
      }
    })()
  }, [presignFetcher.data, saveFetcher])

  useEffect(() => {
    const data = saveFetcher.data
    if (!data) return

    if (!data.ok) {
      console.error(data.error)
      pendingFileRef.current = null
      return
    }

    if (data.step !== 'saved') return

    pendingFileRef.current = null
    revalidator.revalidate()
    console.log('Uploaded and saved.')
  }, [saveFetcher.data, revalidator])

  function onFilePicked(file: File) {
    if (file.type !== 'application/pdf') {
      console.log('Only PDF files are allowed.')
      return
    }

    lastUploadedKeyRef.current = null
    pendingFileRef.current = file

    const form = new FormData()
    form.set('intent', 'presign')
    form.set('name', file.name)
    form.set('contentType', file.type)

    presignFetcher.submit(form, { method: 'post', action: '/documents' })
  }

  const isRequestingPresign = presignFetcher.state !== 'idle'
  const isSavingMetadata = saveFetcher.state !== 'idle'
  const isBusy = isRequestingPresign || uploadingToS3 || isSavingMetadata

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
                <div className="col-span-1 text-right opacity-60">-</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isBusy && <div className="text-sm opacity-70">Uploading...</div>}
    </div>
  )
}
