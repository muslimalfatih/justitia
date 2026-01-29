import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, FileText, MessageSquare, Calendar, ArrowRight, Briefcase, CheckCircle2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { trpc } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface CaseItem {
  id: string
  title: string
  category: string
  description: string
  status: string
  fileCount: number
  quoteCount: number
  createdAt: string
}

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionLoading } = authClient.useSession()

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (!sessionLoading && (!session || (session.user as any).role !== 'client')) {
      navigate('/login')
    }
  }, [session, sessionLoading, navigate])

  const { data: cases, isLoading } = useQuery(trpc.cases.getMyCases.queryOptions({
    page: 1,
    pageSize: 10,
  }))

  if (sessionLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-10 w-40 sm:w-48" />
            <Skeleton className="h-4 sm:h-5 w-56 sm:w-64" />
          </div>
          <Skeleton className="h-10 sm:h-12 w-full sm:w-40 rounded-xl" />
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Cases</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your legal case requests</p>
        </div>
        <Button onClick={() => navigate('/client/create-case')} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create New Case
        </Button>
      </div>

      {cases?.items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">You haven't created any cases yet.</p>
            <Button onClick={() => navigate('/client/create-case')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Case
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(cases?.items as unknown as CaseItem[])?.map((caseItem) => {
            const isEngaged = caseItem.status === 'engaged'
            const isOpen = caseItem.status === 'open'
            
            return (
              <Card 
                key={caseItem.id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                  isEngaged ? 'border-l-4 border-l-green-500' : ''
                }`}
                onClick={() => navigate(`/client/case/${caseItem.id}`)}
              >
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{caseItem.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{caseItem.category}</CardDescription>
                    </div>
                    <Badge
                      variant={isEngaged ? 'default' : isOpen ? 'secondary' : 'outline'}
                      className="w-fit shrink-0 text-xs"
                    >
                      {isEngaged && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {isEngaged ? 'Lawyer Assigned' : caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{caseItem.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {caseItem.fileCount} files
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {caseItem.quoteCount} quotes
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(caseItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/client/case/${caseItem.id}`)
                      }}
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {cases && cases.pagination.total > 10 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled>
            Previous
          </Button>
          <Button variant="outline" disabled>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
