import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { trpcClient } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const CASE_CATEGORIES = [
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

export default function CreateCase() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
  })

  useEffect(() => {
    if (!sessionLoading && (!session || (session.user as any).role !== 'client')) {
      navigate('/login')
    }
  }, [session, sessionLoading, navigate])

  const createCaseMutation = useMutation({
    mutationFn: (data: { title: string; category: string; description: string }) =>
      trpcClient.cases.create.mutate(data as any),
    onSuccess: async (data: { id: string }) => {
      toast.success('Case created successfully!')

      // Upload files if any
      if (files.length > 0) {
        setUploading(true)
        try {
          for (const file of files) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('caseId', data.id)

            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/upload`, {
              method: 'POST',
              body: formData,
              credentials: 'include',
            })

            if (!response.ok) {
              throw new Error('File upload failed')
            }
          }
          toast.success(`${files.length} file(s) uploaded successfully!`)
        } catch (error) {
          toast.error('Some files failed to upload')
        } finally {
          setUploading(false)
        }
      }

      navigate('/client/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create case')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    createCaseMutation.mutate({
      title: formData.title,
      category: formData.category as any,
      description: formData.description,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter((file) => {
        const isValidType = file.type === 'application/pdf' || file.type.startsWith('image/')
        const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
        if (!isValidType) {
          toast.error(`${file.name}: Only PDF and images are allowed`)
          return false
        }
        if (!isValidSize) {
          toast.error(`${file.name}: File size must be less than 10MB`)
          return false
        }
        return true
      })
      setFiles(validFiles)
    }
  }

  if (sessionLoading) {
    return null
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create New Case</CardTitle>
          <CardDescription>Submit your legal case for lawyer quotes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Case Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of your legal issue"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value || '' })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
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

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information about your case..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Include relevant facts, dates, and any specific legal questions you have
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Supporting Documents</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Upload relevant documents (PDF or images, max 10MB each)
              </p>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>📎</span>
                      <span>{file.name}</span>
                      <span className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/client/dashboard')}
                disabled={createCaseMutation.isPending || uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCaseMutation.isPending || uploading} className="flex-1">
                {createCaseMutation.isPending
                  ? 'Creating...'
                  : uploading
                    ? 'Uploading files...'
                    : 'Create Case'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
