# Multi-Resume System Implementation Plan

## Overview
Implement a comprehensive multi-resume management system that allows users to upload, manage, and select different resumes for different job applications.

---

## 1. Database Schema Changes

### Current Resume Model (EXISTING)
```prisma
model Resume {
  id            String         @id @default(cuid())
  userId        String
  fileName      String
  fileUrl       String
  content       String?        // Extracted text content
  skills        String?        // JSON array of skills
  experience    String?        // JSON array of experience
  education     String?        // JSON array of education
  embedding     String?        // JSON array for vector embedding
  isActive      Boolean        @default(true)  // ⚠️ Will change meaning
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isActive])
}
```

### Enhanced Resume Model (NEW)
```prisma
model Resume {
  id            String         @id @default(cuid())
  userId        String

  // User-provided metadata
  displayName   String         // User-friendly name (e.g., "Software Engineer Resume", "Data Science Resume")
  fileName      String         // Original file name (e.g., "john_doe_resume_v2.pdf")

  // File storage
  fileUrl       String         // Path to stored file
  fileSizeBytes Int            // Track file size for limits

  // Extracted content
  content       String?        // Extracted text content
  skills        String?        // JSON array of skills
  experience    String?        // JSON array of experience
  education     String?        // JSON array of education
  embedding     String?        // JSON array for vector embedding

  // Status & organization
  isPrimary     Boolean        @default(false)  // ⚠️ NEW: Main resume flag (only one per user)
  isActive      Boolean        @default(true)   // ⚠️ CHANGED: Now means "not deleted" (soft delete)

  // Usage tracking
  lastUsedAt    DateTime?      // Track when last used for analysis
  usageCount    Int            @default(0)      // Track how many times used

  // Metadata
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isPrimary])
  @@index([isActive])
  @@unique([userId, isPrimary]) // Ensure only ONE primary resume per user
}
```

### Migration Strategy
1. Add new columns with defaults
2. Set first resume as `isPrimary = true` for existing users
3. Set all existing resumes as `isActive = true`
4. Add displayName from fileName for existing resumes
5. Set fileSizeBytes = 0 for existing (can't retroactively determine)

### Business Rules
- **Primary Resume**: Exactly ONE resume per user can be `isPrimary = true`
- **Resume Limits**:
  - Max 30 resumes per user (`COUNT(*)` where `isActive = true`)
  - Max 10MB per resume file
- **Soft Delete**: Setting `isActive = false` instead of hard delete (keep match history)

---

## 2. API Endpoints

### A. Resume Upload API (MODIFY EXISTING)
**Endpoint**: `POST /api/resumes/upload`

**Changes**:
- Add `displayName` to request body (required)
- Enforce 10MB file size limit
- Enforce 30 resume max limit
- Return full resume object with id

**Request**:
```typescript
{
  file: File,
  displayName: string,  // NEW
  setPrimary?: boolean  // NEW: Optional, set as primary immediately
}
```

**Response**:
```typescript
{
  success: true,
  resume: {
    id: string,
    displayName: string,
    fileName: string,
    isPrimary: boolean,
    fileSizeBytes: number,
    createdAt: Date
  }
}
```

### B. Resume Management APIs (NEW)

**1. List All Resumes**
```
GET /api/resumes
Response: Resume[]
```

**2. Set Primary Resume**
```
POST /api/resumes/[id]/set-primary
Response: { success: boolean }
```

**3. Update Resume Name**
```
PATCH /api/resumes/[id]
Body: { displayName: string }
Response: { success: boolean, resume: Resume }
```

**4. Delete Resume** (Soft delete)
```
DELETE /api/resumes/[id]
Response: { success: boolean }
```

**5. Get Resume Details**
```
GET /api/resumes/[id]
Response: Resume (with full content for preview)
```

---

## 3. Application Strategy Tab - Resume Selection

### Current Flow (PROBLEM)
```
User clicks "Generate Strategy"
  → Uses default/active resume
  → No choice given
```

### New Flow (SOLUTION)
```
User opens Application tab
  → Sees resume selector dropdown (shows primary by default)
  → User can select different resume
  → Click "Generate Strategy" with selected resume
  → Strategy generated using selected resume's data
```

### UI Design

**Before Analysis** (unified-application-strategy.tsx):
```tsx
<Card>
  <CardHeader>
    <CardTitle>Application Strategy</CardTitle>
  </CardHeader>
  <CardContent>
    {/* NEW: Resume Selector */}
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
      <Label className="text-sm font-medium mb-2">Select Resume</Label>
      <Select
        value={selectedResumeId}
        onValueChange={setSelectedResumeId}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {resumes.map(resume => (
            <SelectItem key={resume.id} value={resume.id}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{resume.displayName}</span>
                {resume.isPrimary && (
                  <Badge variant="secondary" className="text-xs">
                    Primary
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-1">
        Strategy will be generated using this resume
      </p>
    </div>

    {/* Existing: Generate button */}
    <Button onClick={() => generateStrategy(selectedResumeId)}>
      Generate Strategy
    </Button>
  </CardContent>
</Card>
```

**After Analysis Generated**:
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Application Strategy</CardTitle>
        {/* Show which resume was used */}
        <CardDescription className="flex items-center gap-2 mt-1">
          <FileText className="w-3 h-3" />
          <span>Generated using: {usedResume.displayName}</span>
        </CardDescription>
      </div>
      <Button onClick={regenerate} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Regenerate
      </Button>
    </div>
  </CardHeader>
  {/* Rest of analysis display */}
</Card>
```

### API Changes

**application-strategy-analysis/route.ts**:
- Add `resumeId` query parameter (optional, uses primary if not provided)
- Fetch specified resume instead of always using primary
- Store `usedResumeId` in cached analysis for reference

---

## 4. Profile Page - Resume Management Section

### Location
Add new section in `/profile` page after API Key section

### UI Design

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          My Resumes
        </CardTitle>
        <CardDescription>
          Manage your resumes. You have {resumes.length}/30 resumes.
        </CardDescription>
      </div>
      <Button onClick={handleUpload}>
        <Upload className="w-4 h-4 mr-2" />
        Upload New Resume
      </Button>
    </div>
  </CardHeader>

  <CardContent>
    {/* Resume Grid/List */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {resumes.map(resume => (
        <Card key={resume.id} className={resume.isPrimary ? 'border-blue-500 border-2' : ''}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{resume.displayName}</CardTitle>
                  {resume.isPrimary && (
                    <Badge className="bg-blue-100 text-blue-700">
                      <Star className="w-3 h-3 mr-1 fill-blue-700" />
                      Primary
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  {resume.fileName} • {formatFileSize(resume.fileSizeBytes)}
                </CardDescription>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => viewResume(resume.id)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  {!resume.isPrimary && (
                    <DropdownMenuItem onClick={() => setPrimary(resume.id)}>
                      <Star className="w-4 h-4 mr-2" />
                      Set as Primary
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => rename(resume.id)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => download(resume.id)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  {!resume.isPrimary && (
                    <DropdownMenuItem
                      onClick={() => deleteResume(resume.id)}
                      className="text-red-600"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            {/* Resume Stats */}
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
                <span>Used {resume.usageCount} times</span>
              </div>
            </div>

            {/* Quick Preview Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => previewResume(resume.id)}
            >
              <Eye className="w-3 h-3 mr-2" />
              Quick Preview
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Upload Dialog */}
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Resume</DialogTitle>
          <DialogDescription>
            Max file size: 10MB. Supported formats: PDF, DOC, DOCX
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Resume Name *</Label>
            <Input
              placeholder="e.g., Software Engineer Resume"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <Label>File *</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="setPrimary"
              checked={setPrimary}
              onCheckedChange={setSetPrimary}
            />
            <Label htmlFor="setPrimary" className="text-sm">
              Set as primary resume
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setUploadOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUploadSubmit} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Preview Dialog */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{previewResume?.displayName}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto">
          <pre className="text-xs whitespace-pre-wrap p-4 bg-gray-50 rounded">
            {previewResume?.content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  </CardContent>
</Card>
```

---

## 5. Integration with Match Calculation

### Current Issue
- Match calculation uses `isActive = true` to find resume
- When multiple resumes exist, which one to use?

### Solution
- Match calculation ALWAYS uses primary resume by default
- Application Strategy can specify a different resume
- Store `matchResumeId` in job to track which resume was used for match

### Job Model Update
```prisma
matchResumeId     String?        // NEW: Track which resume was used
```

---

## 6. Implementation Order

### Phase 1: Database & Backend
1. ✅ Create migration file for Resume model changes
2. ✅ Update Resume upload API
3. ✅ Create Resume management APIs
4. ✅ Update match calculation to use primary resume
5. ✅ Update Application Strategy to accept resumeId

### Phase 2: Profile UI
6. ✅ Create Resume Management component
7. ✅ Add to Profile page
8. ✅ Test upload, rename, delete, set primary flows

### Phase 3: Application Strategy UI
9. ✅ Add resume selector to Application Strategy tab
10. ✅ Pass selected resume to API
11. ✅ Display which resume was used in results

### Phase 4: Testing & Polish
12. ✅ Fix remaining decimal percentages
13. ✅ Test complete flow end-to-end
14. ✅ Add loading states, error handling
15. ✅ Update onboarding if needed

---

## 7. Edge Cases & Validation

### Business Logic Validation
- ❌ Cannot delete primary resume (must set another as primary first)
- ❌ Cannot have more than 30 resumes
- ❌ Cannot upload file > 10MB
- ❌ Must have at least one resume to use match/strategy features
- ✅ Setting new primary auto-unsets old primary (atomic transaction)

### UI States
- **No resumes**: Show upload prompt
- **One resume**: Automatically primary, hide selector
- **Multiple resumes**: Show selector with primary preselected
- **Analysis in progress**: Disable resume selector
- **Cached analysis**: Show which resume was used, allow regenerate

---

## 8. Decimal Percentage Fix

### Files to Fix
All instances of `{score}%` or `{matchScore}%` should be `{Math.round(score)}%`

**Priority Files**:
1. `unified-application-strategy.tsx` - ATS Match Score display
2. `resume-optimizer.tsx` - ATS Compatibility
3. `performance-analytics.tsx` - Stats display
4. `smart-recommendations.tsx` - Match percentages

---

## Success Criteria
✅ User can upload multiple resumes with custom names
✅ User can set one resume as primary
✅ User can view, rename, delete resumes from profile
✅ Application Strategy tab allows resume selection
✅ Match calculation uses correct resume (primary by default)
✅ All percentages display as whole numbers
✅ File size limits enforced (10MB)
✅ Resume count limit enforced (30 max)
✅ Clean, professional UI
✅ No breaking changes to existing functionality
