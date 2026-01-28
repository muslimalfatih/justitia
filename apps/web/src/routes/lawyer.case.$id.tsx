import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { trpc, trpcClient } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface FileItem {
  id: string
  storageKey: string
  originalFilename: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}

export default function LawyerCaseDetail() {
  const navigate = useNavigate()
  const { id: caseId } = useParams<{ id: string }>()
  const { data: session, isPending: sessionLoading } = authClient.useSession()

  useEffect(() => {
    if (!sessionLoading && (!session || (session.user as any).role !== 'lawyer')) {
      navigate('/login')
    }
  }, [session, sessionLoading, navigate])

  const { data: caseData, isLoading, error } = useQuery(
    trpc.cases.getCaseForLawyer.queryOptions(
      { caseId: caseId! },
      { enabled: !!caseId }
    )
  )

  const handleDownloadFile = async (storageKey: string, filename: string) => {
    try {
      const { url } = await trpcClient.files.getSignedUrl.query({ storageKey })
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.target = '_blank'
      link.click()
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  if (sessionLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {error.message || 'You do not have access to this case'}
            </p>
            <Button onClick={() => navigate('/lawyer/quotes')}>Back to My Quotes</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session || !caseData) {
    return null
  }

  const { case: caseInfo, quote, files } = caseData

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{caseInfo.title}</h1>
          <p className="text-muted-foreground">{caseInfo.category}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{caseInfo.status}</Badge>
          <Button variant="outline" onClick={() => navigate('/lawyer/quotes')}>
            Back to My Quotes
          </Button>
        </div>
      </div>

      {/* Your Accepted Quote */}
      <Card className="border-green-500 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-green-700">Your Accepted Quote</CardTitle>
          <CardDescription>
            Congratulations! Your quote was accepted on{' '}
            {new Date(quote.updatedAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Quote Amount</p>
              <p className="text-2xl font-bold">${parseFloat(quote.amount).toLocaleString()}</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div>
              <p className="text-sm text-muted-foreground">Expected Duration</p>
              <p className="text-2xl font-bold">{quote.expectedDays} days</p>
            </div>
          </div>
          {quote.note && (
            <div className="mt-4 p-3 bg-white/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Your Note</p>
              <p>{quote.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Description - Now fully visible */}
      <Card>
        <CardHeader>
          <CardTitle>Full Case Details</CardTitle>
          <CardDescription>
            Client submitted on {new Date(caseInfo.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{caseInfo.description}</p>
        </CardContent>
      </Card>

      {/* Case Files - Now downloadable */}
      <Card>
        <CardHeader>
          <CardTitle>Case Documents ({files.length})</CardTitle>
          <CardDescription>
            Download all supporting documents submitted by the client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No documents were uploaded for this case
            </p>
          ) : (
            <div className="space-y-2">
              {files.map((file: FileItem) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {file.mimeType === 'application/pdf' ? '📄' : '🖼️'}
                    </span>
                    <div>
                      <p className="font-medium">{file.originalFilename}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded{' '}
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDownloadFile(file.storageKey, file.originalFilename)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Info Note */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">💼</span>
            <div>
              <h3 className="font-medium">Next Steps</h3>
              <p className="text-sm text-muted-foreground">
                Review all case documents and begin working on this case. Contact the client through
                the platform's messaging system (coming soon) or use the contact details provided in
                the case description.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
