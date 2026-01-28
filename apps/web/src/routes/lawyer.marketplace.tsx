import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
          <h1 className="text-3xl font-bold">Case Marketplace</h1>
          <p className="text-muted-foreground">Browse and submit quotes for legal cases</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lawyer/quotes')}>
          My Quotes
        </Button>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2 items-center">
          <Label htmlFor="category-filter">Category:</Label>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value || 'All')}>
            <SelectTrigger id="category-filter" className="w-48">
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
        </div>
        <div className="flex gap-2 items-center">
          <Label htmlFor="date-filter">Posted:</Label>
          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value || 'all')}>
            <SelectTrigger id="date-filter" className="w-40">
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
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No cases available matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(cases?.items as unknown as MarketplaceCase[])?.map((caseItem) => (
            <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{caseItem.title}</CardTitle>
                    <CardDescription>{caseItem.category}</CardDescription>
                  </div>
                  <Badge variant="default">{caseItem.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm line-clamp-3">{redactSensitiveInfo(caseItem.description)}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground space-x-4">
                    <span>💬 {caseItem.quoteCount} quotes</span>
                    <span>📅 Posted {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                  </div>
                  {caseItem.hasSubmittedQuote ? (
                    <Badge variant="secondary" className="px-4 py-2">
                      ✓ Quote Submitted
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedCase(caseItem.id)
                        setDialogOpen(true)
                      }}
                    >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quote</DialogTitle>
            <DialogDescription>
              Provide your quote for this case. The client will review all quotes before making a
              decision.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitQuote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Fee Amount (USD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000.00"
                value={quoteForm.amount}
                onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDays">Expected Days to Complete *</Label>
              <Input
                id="expectedDays"
                type="number"
                min="1"
                placeholder="30"
                value={quoteForm.expectedDays}
                onChange={(e) => setQuoteForm({ ...quoteForm, expectedDays: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Additional Notes (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Explain your approach, experience, or any clarifications..."
                value={quoteForm.note}
                onChange={(e) => setQuoteForm({ ...quoteForm, note: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
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
              <Button type="submit" disabled={submitQuoteMutation.isPending} className="flex-1">
                {submitQuoteMutation.isPending ? 'Submitting...' : 'Submit Quote'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
