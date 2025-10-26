# Remaining AI Task Tracking Integrations

## ✅ Completed
1. **extraction-queue.ts** - ✅ Fully integrated
2. **enhanced-salary-analysis/route.ts** - ✅ Fully integrated

## 📝 Remaining Integrations

The imports have been added to all files. Now need to add task tracking at key points.

---

## 1. location-analysis/route.ts

**Pattern:** Same as salary analysis

### Add after line ~55 (after getting job data):
```typescript
//CREATE AI TASK for tracking
let aiTask: any = null;
try {
  aiTask = await aiTaskTracker.createTask({
    userId: user.id,
    type: AITaskType.LOCATION_ANALYSIS,
    jobId: jobId,
    jobTitle: job.title,
    company: job.company,
    navigationPath: `/jobs/${jobId}`,
    navigationTab: 'location',
    estimatedDuration: 40000, // 40 seconds
  });
```

### When returning cached data (~line 80):
```typescript
// MARK AI TASK AS CACHED
if (aiTask) {
  await aiTaskTracker.markAsCached(aiTask.id);
}
return NextResponse.json({ ...cached... });
```

### Before web search (~line 120):
```typescript
// UPDATE AI TASK: PROCESSING
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    status: AITaskStatus.PROCESSING,
    currentStep: 'Searching for location data...',
    progress: 10
  });
}
```

### Before AI analysis (~line 180):
```typescript
// UPDATE AI TASK: Analyzing
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    currentStep: 'Analyzing location with AI...',
    progress: 50
  });
}
```

### After successful analysis (before return):
```typescript
// COMPLETE AI TASK
if (aiTask) {
  await aiTaskTracker.completeTask(aiTask.id, { analysis: 'success' });
}
```

### In catch block:
```typescript
} catch (error) {
  console.error('Location analysis failed:', error);

  // FAIL AI TASK
  try {
    if (aiTask) {
      await aiTaskTracker.failTask(aiTask.id, error instanceof Error ? error.message : 'Unknown error');
    }
  } catch (taskError) {
    console.error('Failed to update AI task:', taskError);
  }

  return NextResponse.json({ error: '...' }, { status: 500 });
}
```

---

## 2. application-strategy-analysis/route.ts

**Pattern:** Same as salary analysis + centralized match tracking

### Add after line ~55 (after getting job data):
```typescript
// CREATE AI TASK for tracking
let aiTask: any = null;
try {
  aiTask = await aiTaskTracker.createTask({
    userId: user.id,
    type: AITaskType.APPLICATION_STRATEGY,
    jobId: jobId,
    jobTitle: job.title,
    company: job.company,
    navigationPath: `/jobs/${jobId}`,
    navigationTab: 'application',
    estimatedDuration: 50000, // 50 seconds
  });
```

### When returning cached data (~line 85):
```typescript
// MARK AI TASK AS CACHED
if (aiTask) {
  await aiTaskTracker.markAsCached(aiTask.id);
}
return NextResponse.json({ ...cached... });
```

### Before web search (~line 150):
```typescript
// UPDATE AI TASK: PROCESSING
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    status: AITaskStatus.PROCESSING,
    currentStep: 'Searching for company intelligence...',
    progress: 10
  });
}
```

### Before centralized match (~line 210):
```typescript
// UPDATE AI TASK: Match calculation
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    currentStep: 'Calculating resume match...',
    progress: 40
  });
}
```

### Before AI analysis (~line 225):
```typescript
// UPDATE AI TASK: Generating strategy
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    currentStep: 'Generating application strategy...',
    progress: 70
  });
}
```

### After successful analysis (before return):
```typescript
// COMPLETE AI TASK
if (aiTask) {
  await aiTaskTracker.completeTask(aiTask.id, { analysis: 'success' });
}
```

### In catch block (same as location analysis)

---

## 3. resume-optimization/route.ts

**Pattern:** Same as others

### Add after line ~50 (after getting job data):
```typescript
// CREATE AI TASK for tracking
let aiTask: any = null;
try {
  aiTask = await aiTaskTracker.createTask({
    userId: user.id,
    type: AITaskType.RESUME_OPTIMIZATION,
    jobId: jobId,
    jobTitle: job.title,
    company: job.company,
    navigationPath: `/jobs/${jobId}`,
    navigationTab: 'application',
    estimatedDuration: 35000, // 35 seconds
  });
```

### When returning cached data (~line 75):
```typescript
// MARK AI TASK AS CACHED
if (aiTask) {
  await aiTaskTracker.markAsCached(aiTask.id);
}
return NextResponse.json({ ...cached... });
```

### Before AI analysis (~line 180):
```typescript
// UPDATE AI TASK: PROCESSING
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    status: AITaskStatus.PROCESSING,
    currentStep: 'Analyzing resume optimization...',
    progress: 50
  });
}
```

### After successful analysis (before return):
```typescript
// COMPLETE AI TASK
if (aiTask) {
  await aiTaskTracker.completeTask(aiTask.id, { analysis: 'success' });
}
```

### In catch block (same as others)

---

## 4. centralized-match-service.ts

**Important:** This is called BY other services, so we need to be careful about tracking.

### Option A: Track at the caller level (RECOMMENDED)
Don't add tracking in the match service itself - let callers track it as part of their own tasks.

### Option B: Track as separate task
If we want match calculations to show separately:

In `calculateMatch()` method after line ~50:
```typescript
// CREATE AI TASK for match calculation
const aiTask = await aiTaskTracker.createTask({
  userId: params.userId,
  type: AITaskType.MATCH_CALCULATION,
  jobId: params.jobId,
  jobTitle: params.jobTitle,
  company: params.jobCompany,
  navigationPath: `/jobs/${params.jobId}`,
  navigationTab: 'overview',
  estimatedDuration: 20000,
});

// Check cache
const cached = await this.checkCache(params);
if (cached) {
  await aiTaskTracker.markAsCached(aiTask.id);
  return cached;
}

// UPDATE: PROCESSING
await aiTaskTracker.updateProgress(aiTask.id, {
  status: AITaskStatus.PROCESSING,
  currentStep: 'Analyzing resume match...',
  progress: 50
});

// ... perform matching ...

// COMPLETE
await aiTaskTracker.completeTask(aiTask.id, result);
return result;
```

**Recommendation:** Use Option A for now - match calculation is usually part of a larger analysis (salary, application strategy). We can add Option B later if users want to see it separately.

---

## Quick Integration Script

For fast manual integration, search for these patterns in each file and add tracking code above/below:

### Search Patterns:
1. `forceRefresh && job.extractedData` → Add task creation BEFORE this
2. `Using cached` → Add `markAsCached()` BEFORE return
3. `web search` or `searchWeb` → Add progress update BEFORE
4. `unifiedAI.complete` or `gpt5Service` → Add progress update BEFORE
5. `return NextResponse.json({ success: true` → Add `completeTask()` BEFORE
6. `catch (error)` at top level → Add `failTask()` inside

---

## Testing Checklist

After integration:
- [ ] Extract a job → Verify task appears and updates
- [ ] Run salary analysis → Verify task tracking
- [ ] Run location analysis → Verify task tracking
- [ ] Run application strategy → Verify task tracking
- [ ] Run resume optimization → Verify task tracking
- [ ] Test cached returns → Verify CACHED status
- [ ] Test failures → Verify FAILED status
- [ ] Test multiple concurrent analyses → Verify all appear

---

## Notes

- All imports are already added ✅
- Use `let aiTask: any = null;` at function start for error handling scope
- Always wrap `failTask()` in try-catch to prevent masking original errors
- Progress percentages: 0→10→40→70→100 is a good pattern
- Estimated durations: Extraction=30s, Resume=35s, Location=40s, Salary=45s, Application=50s
