import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { trpc, trpcClient } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

type QuoteStatus = 'all' | 'proposed' | 'accepted' | 'rejected'

interface Quote {
  id: string
  amount: string
  expectedDays: number
  note: string | null
  status: string
  createdAt: string
  case: {
    id: string
    title: string
    category: string
  }
}

export default function LawyerQuotes() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [statusFilter, setStatusFilter] = useState<QuoteStatus>('all')

  useEffect(() => {
    if (!sessionLoading && (!session || (session.user as any).role !== 'lawyer')) {
      navigate('/login')
    }
  }, [session, sessionLoading, navigate])

  const { data: quotes, isLoading } = useQuery(
    trpc.quotes.getMyQuotes.queryOptions({
      page: 1,
      pageSize: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
    })
  )

  const withdrawQuoteMutation = useMutation({
    mutationFn: (data: { quoteId: string }) => trpcClient.quotes.withdraw.mutate(data),
    onSuccess: () => {
      toast.success('Quote withdrawn successfully')
      queryClient.invalidateQueries({ queryKey: ['quotes', 'getMyQuotes'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to withdraw quote')
    },
  })

  const handleWithdraw = (quoteId: string) => {
    if (confirm('Are you sure you want to withdraw this quote?')) {
      withdrawQuoteMutation.mutate({ quoteId })
    }
  }

  if (sessionLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Quotes</h1>
          <p className="text-muted-foreground">Track your submitted quotes and accepted cases</p>
        </div>
        <Button onClick={() => navigate('/lawyer/marketplace')}>
          Browse Marketplace
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="proposed">Proposed</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {quotes?.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'all' 
                ? "You haven't submitted any quotes yet."
                : `No ${statusFilter} quotes found.`}
            </p>
            <Button onClick={() => navigate('/lawyer/marketplace')}>
              Browse Cases
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes?.items.map((quote: Quote) => {
            const isAccepted = quote.status === 'accepted'
            const isRejected = quote.status === 'rejected'
            
            return (
              <Card 
                key={quote.id} 
                className={`hover:shadow-md transition-shadow ${
                  isAccepted 
                    ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                    : isRejected 
                      ? 'opacity-60' 
                      : ''
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{quote.case.title}</CardTitle>
                      <CardDescription>{quote.case.category}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        isAccepted
                          ? 'default'
                          : quote.status === 'proposed'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className={isAccepted ? 'bg-green-600' : ''}
                    >
                      {isAccepted ? '✓ Accepted & Paid' : quote.status}
                    </Badge>
                  </div>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Your Quote:</span>
                    <p className="font-semibold">${parseFloat(quote.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Duration:</span>
                    <p className="font-semibold">{quote.expectedDays} days</p>
                  </div>
                </div>

                {quote.note && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Your Note:</span>
                    <p className="mt-1">{quote.note}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Submitted {new Date(quote.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {quote.status === 'proposed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdraw(quote.id)}
                        disabled={withdrawQuoteMutation.isPending}
                      >
                        Withdraw
                      </Button>
                    )}
                    {quote.status === 'accepted' && (
                      <Button size="sm" onClick={() => navigate(`/lawyer/case/${quote.case.id}`)}>
                        View Case Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
