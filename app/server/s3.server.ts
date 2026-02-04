import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const region = process.env.AWS_REGION
const bucket = process.env.AWS_S3_BUCKET_NAME

if (!region) throw new Error('Missing AWS_REGION')
if (!bucket) throw new Error('Missing AWS_S3_BUCKET_NAME')

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function createPresignedUploadUrl(params: {
  key: string
  contentType: string
}) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 })
  return { uploadUrl }
}
