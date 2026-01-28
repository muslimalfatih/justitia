import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
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
          <h1 className="text-3xl font-bold">My Cases</h1>
          <p className="text-muted-foreground">Manage your legal case requests</p>
        </div>
        <Button onClick={() => navigate('/client/create-case')}>
          Create New Case
        </Button>
      </div>

      {cases?.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You haven't created any cases yet.</p>
            <Button onClick={() => navigate('/client/create-case')}>
              Create Your First Case
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(cases?.items as unknown as CaseItem[])?.map((caseItem) => (
            <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{caseItem.title}</CardTitle>
                    <CardDescription>{caseItem.category}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      caseItem.status === 'open'
                        ? 'default'
                        : caseItem.status === 'engaged'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {caseItem.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm line-clamp-2">{caseItem.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground space-x-4">
                    <span>📄 {caseItem.fileCount} files</span>
                    <span>💬 {caseItem.quoteCount} quotes</span>
                    <span>📅 {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/client/case/${caseItem.id}`)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
