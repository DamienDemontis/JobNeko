'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Upload,
  Star,
  MoreVertical,
  Eye,
  Edit,
  Download,
  Trash,
  Calendar,
  Clock,
  BarChart,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Resume {
  id: string;
  displayName: string;
  fileName: string;
  fileSizeBytes: number;
  isPrimary: boolean;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  content?: string;
}

interface ResumeManagerProps {
  userId: string;
  token: string;
}

export function ResumeManager({ userId, token }: ResumeManagerProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploadSetPrimary, setUploadSetPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameResume, setRenameResume] = useState<Resume | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteResume, setDeleteResume] = useState<Resume | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }

      const data = await response.json();
      setResumes(data.resumes || []);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    setUploadDisplayName('');
    setUploadFile(null);
    setUploadSetPrimary(false);
    setUploadOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only PDF, DOC, and DOCX files are supported.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploadFile(file);
    // Auto-populate display name from filename if empty
    if (!uploadDisplayName) {
      const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setUploadDisplayName(name);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    if (!uploadDisplayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    if (resumes.length >= 30) {
      toast.error('Resume limit reached (30 max). Please delete some resumes first.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', uploadFile);
      formData.append('displayName', uploadDisplayName.trim());
      formData.append('setPrimary', uploadSetPrimary.toString());

      const response = await fetch('/api/resumes/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      toast.success('Resume uploaded successfully');

      setUploadOpen(false);
      setUploadFile(null);
      setUploadDisplayName('');
      setUploadSetPrimary(false);

      // Refresh list
      await fetchResumes();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}/set-primary`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to set primary');
      }

      toast.success('Primary resume updated');
      await fetchResumes();
    } catch (error) {
      console.error('Set primary error:', error);
      toast.error('Failed to set primary resume');
    }
  };

  const handleRename = (resume: Resume) => {
    setRenameResume(resume);
    setRenameValue(resume.displayName);
    setRenameOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameResume) return;

    if (!renameValue.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setRenaming(true);

    try {
      const response = await fetch(`/api/resumes/${renameResume.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ displayName: renameValue.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to rename');
      }

      toast.success('Resume renamed');
      setRenameOpen(false);
      await fetchResumes();
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('Failed to rename resume');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteClick = (resume: Resume) => {
    setDeleteResume(resume);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteResume) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/resumes?id=${deleteResume.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      toast.success('Resume deleted');
      setDeleteOpen(false);
      await fetchResumes();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete resume');
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = async (resume: Resume) => {
    setPreviewResume(resume);
    setPreviewOpen(true);

    // Fetch full content if not already loaded
    if (!resume.content) {
      setLoadingPreview(true);
      try {
        const response = await fetch(`/api/resumes/${resume.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to load content');
        }

        const data = await response.json();
        setPreviewResume(data.resume);
      } catch (error) {
        console.error('Preview error:', error);
        toast.error('Failed to load resume content');
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            My Resumes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            Loading resumes...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Resumes
              </CardTitle>
              <CardDescription className="mt-1">
                Manage your resumes. You have {resumes.length}/30 resumes.
              </CardDescription>
            </div>
            <Button
              onClick={handleUploadClick}
              disabled={resumes.length >= 30}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Resume
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {resumes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
              <p className="text-gray-500 mb-4">Upload your first resume to get started</p>
              <Button
                onClick={handleUploadClick}
                variant="outline"
                className="border-black text-black hover:bg-gray-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((resume) => (
                <Card
                  key={resume.id}
                  className={`transition-all ${
                    resume.isPrimary
                      ? 'border-2 border-black bg-gray-50'
                      : 'border border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">{resume.displayName}</h3>
                          {resume.isPrimary && (
                            <Badge className="bg-black text-white border-0 flex items-center gap-1 px-2 py-0.5">
                              <Star className="w-3 h-3 fill-white" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {resume.fileName} • {formatFileSize(resume.fileSizeBytes)}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handlePreview(resume)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {!resume.isPrimary && (
                            <DropdownMenuItem onClick={() => handleSetPrimary(resume.id)}>
                              <Star className="w-4 h-4 mr-2" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleRename(resume)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          {!resume.isPrimary && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(resume)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>Uploaded {formatDate(resume.createdAt)}</span>
                      </div>
                      {resume.lastUsedAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>Last used {formatDate(resume.lastUsedAt)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <BarChart className="w-3 h-3" />
                        <span>Used {resume.usageCount} {resume.usageCount === 1 ? 'time' : 'times'}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-gray-300 hover:bg-gray-50"
                      onClick={() => handlePreview(resume)}
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      Quick Preview
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Resume</DialogTitle>
            <DialogDescription>
              Max file size: 10MB. Supported formats: PDF, DOC, DOCX
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Resume Name *</Label>
              <Input
                id="displayName"
                placeholder="e.g., Software Engineer Resume"
                value={uploadDisplayName}
                onChange={(e) => setUploadDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
              {uploadFile && (
                <p className="text-xs text-gray-600">
                  Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="setPrimary"
                checked={uploadSetPrimary}
                onCheckedChange={(checked) => setUploadSetPrimary(checked as boolean)}
              />
              <Label htmlFor="setPrimary" className="text-sm font-normal cursor-pointer">
                Set as primary resume
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={uploading || !uploadFile || !uploadDisplayName.trim()}
              className="bg-black text-white hover:bg-gray-800"
            >
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>{previewResume?.displayName}</DialogTitle>
                <DialogDescription className="mt-1">
                  {previewResume?.fileName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] border rounded-lg p-4 bg-gray-50">
            {loadingPreview ? (
              <div className="text-center py-12 text-gray-500">Loading content...</div>
            ) : previewResume?.content ? (
              <pre className="text-xs whitespace-pre-wrap font-mono">{previewResume.content}</pre>
            ) : (
              <div className="text-center py-12 text-gray-500">No content available</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Resume</DialogTitle>
            <DialogDescription>
              Enter a new name for your resume
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">Resume Name</Label>
              <Input
                id="newName"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={100}
                placeholder="Enter new name"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={renaming || !renameValue.trim()}
              className="bg-black text-white hover:bg-gray-800"
            >
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{deleteResume?.displayName}</strong>"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
