import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Calendar, Send, Filter, Clock, DollarSign, FileText, CheckCircle2, Search, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { trpc, trpcClient } from '@/utils/trpc'
import { redactSensitiveInfo } from '@/lib/redact'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const CASE_CATEGORIES = [
  { value: 'All', label: 'All Categories' },
  { value: 'contract', label: 'Contract Law' },
  { value: 'family', label: 'Family Law' },
  { value: 'corporate', label: 'Corporate Law' },
  { value: 'criminal', label: 'Criminal Defense' },
  { value: 'civil', label: 'Civil Litigation' },
  { value: 'property', label: 'Property/Real Estate' },
  { value: 'employment', label: 'Employment Law' },
  { value: 'immigration', label: 'Immigration' },
  { value: 'intellectual_property', label: 'Intellectual Property' },
  { value: 'other', label: 'Other' },
]

const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
]

function getDateFilterValue(filter: string): string | undefined {
  const now = new Date()
  switch (filter) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0)).toISOString()
    case 'week':
      return new Date(now.setDate(now.getDate() - 7)).toISOString()
    case 'month':
      return new Date(now.setDate(now.getDate() - 30)).toISOString()
    default:
      return undefined
  }
}

interface MarketplaceCase {
  id: string
  title: string
  category: string
  description: string
  status: string
  quoteCount: number
  createdAt: string
  hasSubmittedQuote: boolean
}

export default function LawyerMarketplace() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [quoteForm, setQuoteForm] = useState({
    amount: '',
    expectedDays: '',
    note: '',
  })

  useEffect(() => {
    if (!sessionLoading && (!session || (session.user as any).role !== 'lawyer')) {
      navigate('/login')
    }
  }, [session, sessionLoading, navigate])

  const { data: cases, isLoading } = useQuery(
    trpc.cases.getMarketplace.queryOptions({
      page: 1,
      pageSize: 20,
      category: categoryFilter === 'All' ? undefined : categoryFilter as any,
      createdSince: getDateFilterValue(dateFilter),
    })
  )

  const submitQuoteMutation = useMutation({
    mutationFn: (data: { caseId: string; amount: number; expectedDays: number; note?: string }) =>
      trpcClient.quotes.submit.mutate(data),
    onSuccess: () => {
      toast.success('Quote submitted successfully!')
      setDialogOpen(false)
      setQuoteForm({ amount: '', expectedDays: '', note: '' })
      setSelectedCase(null)
      queryClient.invalidateQueries({ queryKey: ['cases', 'getMarketplace'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit quote')
    },
  })

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCase || !quoteForm.amount || !quoteForm.expectedDays) {
      toast.error('Please fill in all required fields')
      return
    }

    submitQuoteMutation.mutate({
      caseId: selectedCase,
      amount: parseFloat(quoteForm.amount),
      expectedDays: parseInt(quoteForm.expectedDays),
      note: quoteForm.note || undefined,
    })
  }

  if (sessionLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-10 w-44 sm:w-56" />
            <Skeleton className="h-4 sm:h-5 w-56 sm:w-72" />
          </div>
          <Skeleton className="h-10 sm:h-12 w-full sm:w-32 rounded-xl" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
          <Skeleton className="h-10 sm:h-12 w-full sm:w-56 rounded-xl" />
          <Skeleton className="h-10 sm:h-12 w-full sm:w-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 sm:h-48 w-full rounded-xl sm:rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Case Marketplace</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Browse and submit quotes for legal cases</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lawyer/quotes')} className="w-full sm:w-auto">
          <FileText className="w-4 h-4 mr-2" />
          My Quotes
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:flex-wrap border rounded-lg p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value || 'All')}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASE_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value || 'all')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cases?.items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No cases available matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(cases?.items as unknown as MarketplaceCase[])?.map((caseItem) => (
            <Card key={caseItem.id} className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle>{caseItem.title}</CardTitle>
                    <CardDescription>{caseItem.category}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{redactSensitiveInfo(caseItem.description)}</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {caseItem.quoteCount} quotes
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Posted {new Date(caseItem.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {caseItem.hasSubmittedQuote ? (
                    <Badge variant="default" className="w-fit">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Quote Submitted
                    </Badge>
                  ) : (
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedCase(caseItem.id)
                        setDialogOpen(true)
                      }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Quote
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Quote</DialogTitle>
            <DialogDescription>
              Provide your quote for this case. The client will review all quotes before making a
              decision.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitQuote} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Fee Amount (USD) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1000.00"
                  className="pl-9"
                  value={quoteForm.amount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDays">Expected Days to Complete *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="expectedDays"
                  type="number"
                  min="1"
                  placeholder="30"
                  className="pl-9"
                  value={quoteForm.expectedDays}
                  onChange={(e) => setQuoteForm({ ...quoteForm, expectedDays: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Additional Notes (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Explain your approach, experience, or any clarifications..."
                className="min-h-24"
                value={quoteForm.note}
                onChange={(e) => setQuoteForm({ ...quoteForm, note: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setQuoteForm({ amount: '', expectedDays: '', note: '' })
                }}
                disabled={submitQuoteMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitQuoteMutation.isPending} 
                className="flex-1"
              >
                {submitQuoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Quote
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
