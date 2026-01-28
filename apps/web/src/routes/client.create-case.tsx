import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { FileText, Upload, Tag, AlignLeft, ArrowLeft, Plus, Paperclip, X, Loader2 } from 'lucide-react'
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
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Create New Case</CardTitle>
          <CardDescription>Submit your legal case for lawyer quotes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Case Title *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="title"
                  placeholder="Brief description of your legal issue"
                  className="pl-9"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value || '' })}
              >
                <SelectTrigger id="category">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select a category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {CASE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value} className="capitalize">
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your case..."
                  className="pl-9 min-h-32"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Include relevant facts, dates, and any specific legal questions you have
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Supporting Documents</Label>
              <div className="relative">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    id="files"
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF or images, max 10MB each
                  </p>
                </div>
              </div>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-background rounded"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/client/dashboard')}
                disabled={createCaseMutation.isPending || uploading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCaseMutation.isPending || uploading} 
                className="flex-1"
              >
                {createCaseMutation.isPending || uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {createCaseMutation.isPending ? 'Creating...' : 'Uploading files...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Case
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
