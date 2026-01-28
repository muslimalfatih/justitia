import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "@justitia/env/server"
import { db, files, cases, quotes, eq, and } from "@justitia/db"
import crypto from "crypto"

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET_NAME = env.R2_BUCKET_NAME
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface UploadFileResult {
  storageKey: string
  fileSize: number
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadFile(
  caseId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<UploadFileResult> {
  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Invalid file type. Allowed types: PDF, PNG, JPEG`)
  }

  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of 10MB`)
  }

  // Generate secure storage key
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
  const randomId = crypto.randomBytes(16).toString('hex')
  const storageKey = `cases/${caseId}/${Date.now()}-${randomId}.${ext}`

  try {
    // Upload to R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      })
    )

    return {
      storageKey,
      fileSize: buffer.length,
    }
  } catch (error) {
    console.error('R2 upload error:', error)
    throw new Error('Failed to upload file to storage')
  }
}

/**
 * Generate a signed URL for downloading a file with access control
 */
export async function getSignedDownloadUrl(
  storageKey: string,
  userId: string,
  userRole: 'client' | 'lawyer'
): Promise<string> {
  // Fetch file and case information
  const fileRecord = await db
    .select({
      file: files,
      case: cases,
    })
    .from(files)
    .innerJoin(cases, eq(files.caseId, cases.id))
    .where(eq(files.storageKey, storageKey))
    .limit(1)

  if (!fileRecord.length || !fileRecord[0]) {
    throw new Error('File not found')
  }

  const caseRecord = fileRecord[0].case

  // Access control: Client must own the case
  if (userRole === 'client' && caseRecord.clientId !== userId) {
    throw new Error('Unauthorized: You do not have access to this file')
  }

  // Access control: Lawyer must have accepted quote and case must be engaged
  if (userRole === 'lawyer') {
    if (caseRecord.status !== 'engaged') {
      throw new Error('Unauthorized: Case is not engaged')
    }

    // Check if lawyer has the accepted quote
    const acceptedQuote = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.id, caseRecord.acceptedQuoteId!),
          eq(quotes.lawyerId, userId),
          eq(quotes.status, 'accepted')
        )
      )
      .limit(1)

    if (!acceptedQuote.length) {
      throw new Error('Unauthorized: You do not have access to this case')
    }
  }

  // Generate signed URL (expires in 1 hour)
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    })

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    })

    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error('Failed to generate download URL')
  }
}

/**
 * Get all files for a case (for authorized users)
 */
export async function getCaseFiles(
  caseId: string,
  userId: string,
  userRole: 'client' | 'lawyer'
) {
  // Verify access to case
  const caseRecord = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  if (!caseRecord.length || !caseRecord[0]) {
    throw new Error('Case not found')
  }

  const caseData = caseRecord[0]

  // Check access
  if (userRole === 'client' && caseData.clientId !== userId) {
    throw new Error('Unauthorized')
  }

  if (userRole === 'lawyer') {
    if (caseData.status !== 'engaged' || !caseData.acceptedQuoteId) {
      throw new Error('Case is not engaged')
    }

    const acceptedQuote = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.id, caseData.acceptedQuoteId),
          eq(quotes.lawyerId, userId),
          eq(quotes.status, 'accepted')
        )
      )
      .limit(1)

    if (!acceptedQuote.length) {
      throw new Error('Unauthorized')
    }
  }

  // Fetch files
  const caseFiles = await db
    .select()
    .from(files)
    .where(eq(files.caseId, caseId))

  return caseFiles
}
