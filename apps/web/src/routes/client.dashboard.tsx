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
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Cases</h1>
          <p className="text-muted-foreground mt-1">Manage your legal case requests</p>
        </div>
        <Button onClick={() => navigate('/client/create-case')}>
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
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle>{caseItem.title}</CardTitle>
                      <CardDescription>{caseItem.category}</CardDescription>
                    </div>
                    <Badge
                      variant={isEngaged ? 'default' : isOpen ? 'secondary' : 'outline'}
                    >
                      {isEngaged && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {isEngaged ? 'Lawyer Assigned' : caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{caseItem.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
