import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { trpc, trpcClient } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { env } from '@justitia/env/web'

const stripePromise = loadStripe(env.VITE_STRIPE_PUBLISHABLE_KEY)

interface FileItem {
  id: string
  storageKey: string
  originalFilename: string
  mimeType: string
  fileSize: number
}

interface QuoteItem {
  id: string
  amount: string
  expectedDays: number
  note: string | null
  status: 'proposed' | 'accepted' | 'rejected'
  createdAt: string
  lawyerName?: string
}

interface PaymentInfo {
  id: string
  status: 'pending' | 'succeeded' | 'failed'
  amount: string
}

function PaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/client/dashboard`,
      },
    })

    if (error) {
      toast.error(error.message || 'Payment failed')
      setIsProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  )
}

export default function ClientCaseDetail() {
  const navigate = useNavigate()
  const { id: caseId } = useParams<{ id: string }>()
  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  useEffect(() => {
    if (!sessionLoading && (!session || (session.user as any).role !== 'client')) {
      navigate('/login')
    }
  }, [session, sessionLoading, navigate])

  const { data: caseData, isLoading } = useQuery(
    trpc.cases.getCaseById.queryOptions(
      { caseId: caseId! },
      { enabled: !!caseId }
    )
  )

  const { data: quotes } = useQuery(
    trpc.quotes.getQuotesForCase.queryOptions(
      { caseId: caseId! },
      { enabled: !!caseId }
    )
  )

  const { data: paymentStatus, refetch: refetchPaymentStatus } = useQuery(
    trpc.payments.getPaymentStatus.queryOptions(
      { caseId: caseId! },
      { 
        enabled: !!caseId,
        // Stop polling once payment succeeded
        refetchInterval: (query) => 
          query.state.data?.status === 'succeeded' ? false : 3000,
      }
    )
  )

  const createPaymentIntentMutation = useMutation({
    mutationFn: (data: { quoteId: string }) => trpcClient.payments.createIntent.mutate(data),
    onSuccess: (data: { clientSecret: string; paymentIntentId: string }) => {
      setClientSecret(data.clientSecret)
      setPaymentDialogOpen(true)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create payment')
    },
  })

  const handleAcceptQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId)
    createPaymentIntentMutation.mutate({ quoteId })
  }

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false)
    setClientSecret(null)
    setSelectedQuoteId(null)
    toast.success('Payment successful! The lawyer will now have access to your case.')
    queryClient.invalidateQueries({ queryKey: ['cases', 'getCaseById'] })
    queryClient.invalidateQueries({ queryKey: ['quotes', 'getQuotesForCase'] })
    queryClient.invalidateQueries({ queryKey: ['payments', 'getPaymentStatus'] })
    // Also refetch immediately
    refetchPaymentStatus()
  }

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <Skeleton className="h-10 sm:h-12 w-48 sm:w-64" />
        <Skeleton className="h-48 sm:h-64 w-full rounded-xl" />
        <Skeleton className="h-24 sm:h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!session || !caseData) {
    return null
  }

  const { case: caseInfo, files, quotes: caseQuotes } = caseData

  const isEngaged = caseInfo.status === 'engaged'
  const isPaid = paymentStatus?.status === 'succeeded'

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">
      {/* Success Banner for Engaged Cases */}
      {isEngaged && isPaid && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-xl sm:text-2xl">✅</span>
              <div>
                <p className="font-semibold text-sm sm:text-base text-green-700 dark:text-green-300">
                  Payment Successful - Lawyer Assigned
                </p>
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                  Your lawyer now has access to your case documents and will begin working on your case.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{caseInfo.title}</h1>
            <Badge
              variant={
                caseInfo.status === 'open'
                  ? 'default'
                  : caseInfo.status === 'engaged'
                    ? 'secondary'
                    : 'outline'
              }
              className="text-xs"
            >
              {caseInfo.status}
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">{caseInfo.category}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/client/dashboard')} className="w-full sm:w-auto">
          Back to Dashboard
        </Button>
      </div>

      {/* Case Description */}
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>
            Created on {new Date(caseInfo.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{caseInfo.description}</p>
        </CardContent>
      </Card>

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({files.length})</CardTitle>
          <CardDescription>Supporting documents for this case</CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-muted-foreground">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {files.map((file: FileItem) => (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl sm:text-2xl shrink-0">
                      {file.mimeType === 'application/pdf' ? '📄' : '🖼️'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{file.originalFilename}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto shrink-0"
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

      {/* Quotes */}
      <Card>
        <CardHeader>
          <CardTitle>Quotes ({quotes?.length ?? 0})</CardTitle>
          <CardDescription>
            {caseInfo.status === 'open'
              ? 'Review and accept a quote to proceed'
              : caseInfo.status === 'engaged'
                ? 'Payment completed - your lawyer is now assigned'
                : 'Case closed'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!quotes || quotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No quotes received yet. Lawyers will submit quotes for your review.
            </p>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote: QuoteItem) => {
                const isAccepted = quote.status === 'accepted'
                const isRejected = quote.status === 'rejected'
                const isPaid = paymentStatus?.status === 'succeeded'
                const isPending = paymentStatus?.status === 'pending'
                
                return (
                  <div
                    key={quote.id}
                    className={`p-3 sm:p-4 border rounded-lg ${
                      isAccepted 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                        : isRejected
                          ? 'border-muted bg-muted/50 opacity-60'
                          : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <span className="text-xl sm:text-2xl font-bold">
                            ${parseFloat(quote.amount).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-xs">{quote.expectedDays} days</Badge>
                          <Badge
                            variant={
                              isAccepted
                                ? 'default'
                                : isRejected
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {isAccepted && isPaid ? '✓ Paid' : quote.status}
                          </Badge>
                        </div>
                        {quote.note && (
                          <p className="text-xs sm:text-sm text-muted-foreground">{quote.note}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Received {new Date(quote.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {isAccepted && isPaid && (
                          <span className="text-xs sm:text-sm text-green-600 font-medium text-center sm:text-left">
                            ✓ Payment Complete
                          </span>
                        )}
                        {isAccepted && isPending && (
                          <span className="text-xs sm:text-sm text-yellow-600 font-medium text-center sm:text-left">
                            Payment Processing...
                          </span>
                        )}
                        {caseInfo.status === 'open' && quote.status === 'proposed' && (
                          <Button
                            onClick={() => handleAcceptQuote(quote.id)}
                            disabled={createPaymentIntentMutation.isPending}
                            className="w-full sm:w-auto"
                          >
                            Accept & Pay
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Enter your payment details to accept this quote
            </DialogDescription>
          </DialogHeader>
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setPaymentDialogOpen(false)
                  setClientSecret(null)
                  setSelectedQuoteId(null)
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
