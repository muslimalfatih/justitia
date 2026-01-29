import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, DollarSign, Clock, Calendar, CheckCircle2, XCircle, AlertCircle, ArrowRight, Trash2, Eye, Loader2 } from 'lucide-react'
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
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-96 rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="w-3 h-3" />
      case 'rejected':
        return <XCircle className="w-3 h-3" />
      default:
        return <AlertCircle className="w-3 h-3" />
    }
  }

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'accepted':
        return 'default'
      case 'rejected':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Quotes</h1>
          <p className="text-muted-foreground mt-1">Track your submitted quotes and accepted cases</p>
        </div>
        <Button onClick={() => navigate('/lawyer/marketplace')}>
          <Search className="w-4 h-4 mr-2" />
          Browse Marketplace
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="proposed" className="data-[state=active]:text-amber-600 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-950/30">
            <AlertCircle className="w-4 h-4 mr-1" />
            Proposed
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:text-green-600 data-[state=active]:bg-green-50 dark:data-[state=active]:bg-green-950/30">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Accepted
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:text-red-600 data-[state=active]:bg-red-50 dark:data-[state=active]:bg-red-950/30">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {quotes?.items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
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
                className={`${
                  isAccepted 
                    ? 'border-l-4 border-l-green-500' 
                    : isRejected 
                      ? 'opacity-70' 
                      : ''
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle>{quote.case.title}</CardTitle>
                      <CardDescription>{quote.case.category}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(quote.status)}>
                      {getStatusIcon(quote.status)}
                      <span className="ml-1">
                        {isAccepted ? 'Accepted & Paid' : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Your Quote</p>
                        <p className="font-semibold">${parseFloat(quote.amount).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{quote.expectedDays} days</p>
                      </div>
                    </div>
                  </div>

                  {quote.note && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Your Note</p>
                      <p className="text-sm">{quote.note}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
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
                          {withdrawQuoteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Withdraw
                            </>
                          )}
                        </Button>
                      )}
                      {quote.status === 'accepted' && (
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/lawyer/case/${quote.case.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Case Details
                          <ArrowRight className="w-4 h-4 ml-1" />
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
