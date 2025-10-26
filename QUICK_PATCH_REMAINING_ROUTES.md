# Quick Patch for Remaining Routes

## Application Strategy Analysis (`application-strategy-analysis/route.ts`)

### 1. After line 16 (requestId declaration), add:
```typescript
let aiTask: any = null; // Track AI task for error handling
```

### 2. After line 58 (after getting job), add:
```typescript
// CREATE AI TASK for tracking
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

### 3. Before line 132 (before returning cached data - around line 129), add:
```typescript
// MARK AI TASK AS CACHED
if (aiTask) {
  await aiTaskTracker.markAsCached(aiTask.id);
}
```

### 4. After line 135 (after cache check, before web search), add:
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

### 5. Before line 393 (before unifiedAI.complete call, around line 390), add:
```typescript
// UPDATE AI TASK: Generating strategy
if (aiTask) {
  await aiTaskTracker.updateProgress(aiTask.id, {
    currentStep: 'Generating application strategy...',
    progress: 70
  });
}
```

### 6. Before final return NextResponse.json (around line 502), add:
```typescript
// COMPLETE AI TASK
if (aiTask) {
  await aiTaskTracker.completeTask(aiTask.id, { analysis: 'success' });
}
```

### 7. In catch block (line 505), after console.error, add:
```typescript
// FAIL AI TASK
try {
  if (aiTask) {
    await aiTaskTracker.failTask(aiTask.id, error instanceof Error ? error.message : 'Unknown error');
  }
} catch (taskError) {
  console.error('Failed to update AI task:', taskError);
}
```

---

## Resume Optimization (`resume-optimization/route.ts`)

### 1. After requestId declaration (around line 15), add:
```typescript
let aiTask: any = null; // Track AI task for error handling
```

### 2. After getting job (around line 55), add:
```typescript
// CREATE AI TASK for tracking
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

### 3. Before returning cached data, add:
```typescript
// MARK AI TASK AS CACHED
if (aiTask) {
  await aiTaskTracker.markAsCached(aiTask.id);
}
```

### 4. Before AI analysis call, add:
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

### 5. Before final return, add:
```typescript
// COMPLETE AI TASK
if (aiTask) {
  await aiTaskTracker.completeTask(aiTask.id, { analysis: 'success' });
}
```

### 6. In catch block, add:
```typescript
// FAIL AI TASK
try {
  if (aiTask) {
    await aiTaskTracker.failTask(aiTask.id, error instanceof Error ? error.message : 'Unknown error');
  }
} catch (taskError) {
  console.error('Failed to update AI task:', taskError);
}
```

---

## ✅ COMPLETED INTEGRATIONS

1. **extraction-queue.ts** - ✅ Full tracking
2. **enhanced-salary-analysis/route.ts** - ✅ Full tracking
3. **centralized-match-service.ts** - ✅ Full tracking
4. **location-analysis/route.ts** - ✅ Full tracking

## ⚠️ PENDING INTEGRATIONS

5. **application-strategy-analysis/route.ts** - Import added, tracking code above
6. **resume-optimization/route.ts** - Import added, tracking code above

## 🎯 RESULT

After applying these patches, **ALL AI operations will appear in the Activity Monitor:**
- Job extraction ✅
- Match calculation ✅
- Salary analysis ✅
- Location analysis ✅
- Application strategy (after patch)
- Resume optimization (after patch)
