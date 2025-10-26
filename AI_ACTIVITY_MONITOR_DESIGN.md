# AI Activity Monitor - Design Specification

## Overview
Real-time monitoring system for all AI analyses across the application, accessible via a header button with dropdown showing ongoing tasks.

---

## 1. Data Architecture

### AI Task Types
```typescript
export enum AITaskType {
  // Job Extraction
  JOB_EXTRACTION = 'job_extraction',

  // Analysis Types
  SALARY_ANALYSIS = 'salary_analysis',
  LOCATION_ANALYSIS = 'location_analysis',
  APPLICATION_STRATEGY = 'application_strategy',
  RESUME_OPTIMIZATION = 'resume_optimization',
  MATCH_CALCULATION = 'match_calculation',

  // Smart AI Components
  INTERVIEW_ANALYSIS = 'interview_analysis',
  NETWORK_ANALYSIS = 'network_analysis',
  INSIDER_INTELLIGENCE = 'insider_intelligence',
  TIMELINE_ANALYSIS = 'timeline_analysis',
  COMPANY_INTELLIGENCE = 'company_intelligence',
  CULTURE_ANALYSIS = 'culture_analysis',
}

export enum AITaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CACHED = 'CACHED', // Returned from cache, no processing needed
}

export interface AITask {
  id: string;
  userId: string;
  type: AITaskType;
  status: AITaskStatus;

  // Job context
  jobId?: string;
  jobTitle?: string;
  company?: string;

  // Progress tracking
  progress: number; // 0-100
  currentStep?: string;

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // milliseconds

  // Results
  error?: string;
  result?: any;

  // Navigation
  navigationTarget: {
    path: string; // /jobs/[id]
    tab?: string; // overview, salary, location, application
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Schema Extension
```prisma
enum AITaskType {
  JOB_EXTRACTION
  SALARY_ANALYSIS
  LOCATION_ANALYSIS
  APPLICATION_STRATEGY
  RESUME_OPTIMIZATION
  MATCH_CALCULATION
  INTERVIEW_ANALYSIS
  NETWORK_ANALYSIS
  INSIDER_INTELLIGENCE
  TIMELINE_ANALYSIS
  COMPANY_INTELLIGENCE
  CULTURE_ANALYSIS
}

enum AITaskStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CACHED
}

model AITask {
  id                String        @id @default(cuid())
  userId            String
  type              AITaskType
  status            AITaskStatus  @default(PENDING)

  // Job context
  jobId             String?
  jobTitle          String?
  company           String?

  // Progress
  progress          Int           @default(0)
  currentStep       String?

  // Timing
  startedAt         DateTime?
  completedAt       DateTime?
  estimatedDuration Int?          // milliseconds

  // Results
  error             String?
  resultData        String?       // JSON

  // Navigation
  navigationPath    String
  navigationTab     String?

  // Metadata
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, createdAt])
  @@index([jobId])
  @@index([status, updatedAt])
}

// Add to User model
model User {
  // ... existing fields
  aiTasks           AITask[]
}
```

---

## 2. Service Layer

### Unified AI Task Tracking Service
```typescript
// lib/services/ai-task-tracker.ts

class AITaskTracker {
  private static instance: AITaskTracker;

  /**
   * Create a new AI task
   */
  async createTask(params: {
    userId: string;
    type: AITaskType;
    jobId?: string;
    jobTitle?: string;
    company?: string;
    navigationPath: string;
    navigationTab?: string;
    estimatedDuration?: number;
  }): Promise<AITask> {
    // Create in database
    // Return task object
  }

  /**
   * Update task progress
   */
  async updateProgress(taskId: string, params: {
    progress?: number;
    currentStep?: string;
    status?: AITaskStatus;
  }): Promise<void> {
    // Update in database
    // Broadcast to real-time listeners
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string, result?: any): Promise<void> {
    // Update status to COMPLETED
    // Set completedAt timestamp
    // Store result if provided
  }

  /**
   * Mark task as failed
   */
  async failTask(taskId: string, error: string): Promise<void> {
    // Update status to FAILED
    // Store error message
  }

  /**
   * Get user's active tasks (PENDING, PROCESSING)
   */
  async getActiveTasks(userId: string): Promise<AITask[]> {
    // Query tasks with status PENDING or PROCESSING
    // Order by createdAt DESC
  }

  /**
   * Get user's recent tasks (all, including completed)
   */
  async getRecentTasks(userId: string, limit: number = 20): Promise<AITask[]> {
    // Query all tasks
    // Order by updatedAt DESC
    // Limit results
  }

  /**
   * Clean up old completed tasks
   */
  async cleanupOldTasks(olderThanHours: number = 24): Promise<void> {
    // Delete COMPLETED/FAILED tasks older than X hours
  }
}
```

### Integration Points

**1. Extraction Queue Service**
```typescript
// lib/services/extraction-queue.ts

async addToQueue(userId: string, url: string): Promise<ExtractionQueue> {
  // Existing code...

  // CREATE AI TASK
  const aiTask = await aiTaskTracker.createTask({
    userId,
    type: AITaskType.JOB_EXTRACTION,
    navigationPath: '/dashboard', // Will update when job created
    estimatedDuration: 30000, // 30 seconds
  });

  // Store aiTaskId in extraction queue metadata
  await prisma.extractionQueue.update({
    where: { id: queueEntry.id },
    data: { aiTaskId }
  });

  return queueEntry;
}

async processExtraction(queueId: string): Promise<void> {
  const queue = await prisma.extractionQueue.findUnique({ where: { id: queueId } });

  // UPDATE AI TASK - PROCESSING
  await aiTaskTracker.updateProgress(queue.aiTaskId, {
    status: AITaskStatus.PROCESSING,
    currentStep: 'Fetching job page...'
  });

  // ... extraction logic with progress updates

  // UPDATE AI TASK - COMPLETED
  await aiTaskTracker.completeTask(queue.aiTaskId);
}
```

**2. Analysis API Routes**
```typescript
// app/api/jobs/[id]/salary-analysis/route.ts

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // CREATE AI TASK
  const aiTask = await aiTaskTracker.createTask({
    userId: user.id,
    type: AITaskType.SALARY_ANALYSIS,
    jobId: params.id,
    jobTitle: job.title,
    company: job.company,
    navigationPath: `/jobs/${params.id}`,
    navigationTab: 'salary',
    estimatedDuration: 45000, // 45 seconds
  });

  try {
    // UPDATE PROGRESS
    await aiTaskTracker.updateProgress(aiTask.id, {
      status: AITaskStatus.PROCESSING,
      currentStep: 'Analyzing salary data...',
      progress: 25
    });

    // ... AI analysis logic

    await aiTaskTracker.updateProgress(aiTask.id, {
      currentStep: 'Generating insights...',
      progress: 75
    });

    // COMPLETE
    await aiTaskTracker.completeTask(aiTask.id, analysisResult);

  } catch (error) {
    // FAIL
    await aiTaskTracker.failTask(aiTask.id, error.message);
    throw error;
  }
}
```

**3. Centralized Match Service**
```typescript
// lib/services/centralized-match-service.ts

async calculateMatch(params: MatchParams): Promise<MatchResult> {
  // CREATE AI TASK
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

  try {
    // Check cache first
    const cached = await this.checkCache(params);
    if (cached) {
      await aiTaskTracker.updateProgress(aiTask.id, {
        status: AITaskStatus.CACHED,
        progress: 100
      });
      return cached;
    }

    // Process match calculation
    await aiTaskTracker.updateProgress(aiTask.id, {
      status: AITaskStatus.PROCESSING,
      currentStep: 'Analyzing resume match...',
      progress: 50
    });

    const result = await this.performMatching(params);

    await aiTaskTracker.completeTask(aiTask.id, result);
    return result;

  } catch (error) {
    await aiTaskTracker.failTask(aiTask.id, error.message);
    throw error;
  }
}
```

---

## 3. API Endpoints

### GET /api/ai-tasks/active
Get user's active AI tasks
```typescript
export async function GET(req: Request) {
  const userId = await getUserId(req);
  const tasks = await aiTaskTracker.getActiveTasks(userId);
  return NextResponse.json({ tasks });
}
```

### GET /api/ai-tasks/recent
Get user's recent AI tasks (with pagination)
```typescript
export async function GET(req: Request) {
  const userId = await getUserId(req);
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const tasks = await aiTaskTracker.getRecentTasks(userId, limit);
  return NextResponse.json({ tasks });
}
```

### GET /api/ai-tasks/stream
Server-Sent Events endpoint for real-time updates
```typescript
export async function GET(req: Request) {
  const userId = await getUserId(req);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial data
  const tasks = await aiTaskTracker.getActiveTasks(userId);
  await writer.write(`data: ${JSON.stringify(tasks)}\n\n`);

  // Subscribe to updates (using polling for SQLite compatibility)
  const interval = setInterval(async () => {
    const updatedTasks = await aiTaskTracker.getActiveTasks(userId);
    await writer.write(`data: ${JSON.stringify(updatedTasks)}\n\n`);
  }, 2000); // Poll every 2 seconds

  // Cleanup on close
  req.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 4. Frontend Components

### AIActivityButton Component
```typescript
// components/ui/ai-activity-button.tsx

'use client';

interface AIActivityButtonProps {
  onOpenDropdown: () => void;
}

export function AIActivityButton({ onOpenDropdown }: AIActivityButtonProps) {
  const [taskCount, setTaskCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time updates via SSE
  useEffect(() => {
    const eventSource = new EventSource('/api/ai-tasks/stream');

    eventSource.onmessage = (event) => {
      const tasks: AITask[] = JSON.parse(event.data);
      setTaskCount(tasks.length);
      setIsProcessing(tasks.some(t => t.status === AITaskStatus.PROCESSING));
    };

    return () => eventSource.close();
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpenDropdown}
      className="relative w-10 h-10 p-0"
    >
      {/* Icon with pulse animation when processing */}
      <Brain className={cn(
        "w-4 h-4",
        isProcessing && "animate-pulse text-blue-600"
      )} />

      {/* Badge showing count */}
      {taskCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {taskCount > 9 ? '9+' : taskCount}
        </Badge>
      )}
    </Button>
  );
}
```

### AIActivityDropdown Component
```typescript
// components/ui/ai-activity-dropdown.tsx

'use client';

export function AIActivityDropdown() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      const response = await fetch(showCompleted
        ? '/api/ai-tasks/recent'
        : '/api/ai-tasks/active'
      );
      const data = await response.json();
      setTasks(data.tasks);
    };

    fetchTasks();

    // Real-time updates
    const eventSource = new EventSource('/api/ai-tasks/stream');
    eventSource.onmessage = (event) => {
      const activeTasks: AITask[] = JSON.parse(event.data);
      if (!showCompleted) {
        setTasks(activeTasks);
      }
    };

    return () => eventSource.close();
  }, [showCompleted]);

  const handleTaskClick = (task: AITask) => {
    const path = task.navigationTab
      ? `${task.navigationPath}?tab=${task.navigationTab}`
      : task.navigationPath;
    router.push(path);
  };

  return (
    <DropdownMenuContent className="w-96" align="end">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Activity</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Active' : 'All'}
          </Button>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="max-h-96">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active AI tasks</p>
          </div>
        ) : (
          <div className="p-2">
            {tasks.map(task => (
              <AITaskItem
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </DropdownMenuContent>
  );
}
```

### AITaskItem Component
```typescript
// components/ui/ai-task-item.tsx

interface AITaskItemProps {
  task: AITask;
  onClick: () => void;
}

export function AITaskItem({ task, onClick }: AITaskItemProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case AITaskStatus.PENDING:
        return <Clock className="w-4 h-4 text-gray-400" />;
      case AITaskStatus.PROCESSING:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case AITaskStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case AITaskStatus.CACHED:
        return <Zap className="w-4 h-4 text-purple-500" />;
      case AITaskStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getTaskLabel = () => {
    const typeLabels = {
      [AITaskType.JOB_EXTRACTION]: 'Extracting job',
      [AITaskType.SALARY_ANALYSIS]: 'Salary analysis',
      [AITaskType.LOCATION_ANALYSIS]: 'Location analysis',
      [AITaskType.APPLICATION_STRATEGY]: 'Application strategy',
      [AITaskType.RESUME_OPTIMIZATION]: 'Resume optimization',
      [AITaskType.MATCH_CALCULATION]: 'Match calculation',
      // ... other types
    };
    return typeLabels[task.type] || task.type;
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="mt-0.5">
        {getStatusIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">
            {getTaskLabel()}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(task.createdAt)}
          </span>
        </div>

        {task.jobTitle && (
          <p className="text-xs text-muted-foreground truncate">
            {task.jobTitle} at {task.company}
          </p>
        )}

        {task.currentStep && task.status === AITaskStatus.PROCESSING && (
          <p className="text-xs text-blue-600 mt-1">
            {task.currentStep}
          </p>
        )}

        {task.error && task.status === AITaskStatus.FAILED && (
          <p className="text-xs text-red-600 mt-1">
            {task.error}
          </p>
        )}

        {/* Progress Bar */}
        {task.status === AITaskStatus.PROCESSING && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### UserAvatarMenu Component
```typescript
// components/ui/user-avatar-menu.tsx

'use client';

export function UserAvatarMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const getInitial = () => {
    return (user?.name || user?.email || 'U')[0].toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-10 h-10 rounded-full p-0"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {getInitial()}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User Info */}
        <div className="px-3 py-2 border-b">
          <p className="font-medium truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        {/* Menu Items */}
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 5. Updated Site Header

```typescript
// components/ui/site-header.tsx

'use client';

export function SiteHeader() {
  const [showAIDropdown, setShowAIDropdown] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <JobNekoLogo size={60} textClassName="text-3xl" />
            <div>
              <p className="text-gray-600 text-sm">Welcome back, {user?.name || user?.email}</p>
            </div>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* AI Activity Monitor */}
            <DropdownMenu open={showAIDropdown} onOpenChange={setShowAIDropdown}>
              <DropdownMenuTrigger asChild>
                <div>
                  <AIActivityButton onOpenDropdown={() => setShowAIDropdown(true)} />
                </div>
              </DropdownMenuTrigger>
              <AIActivityDropdown />
            </DropdownMenu>

            {/* User Avatar Menu */}
            <UserAvatarMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
```

---

## 6. Implementation Checklist

### Phase 1: Database & Service
- [ ] Add AITask model to Prisma schema
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Create `ai-task-tracker.ts` service
- [ ] Add aiTaskId to ExtractionQueue model (optional metadata field)

### Phase 2: Integration
- [ ] Update extraction-queue.ts to create/update tasks
- [ ] Update salary-analysis route to track tasks
- [ ] Update location-analysis route to track tasks
- [ ] Update application-strategy-analysis route to track tasks
- [ ] Update resume-optimization route to track tasks
- [ ] Update centralized-match-service to track tasks

### Phase 3: API Endpoints
- [ ] Create /api/ai-tasks/active route
- [ ] Create /api/ai-tasks/recent route
- [ ] Create /api/ai-tasks/stream route (SSE)

### Phase 4: Frontend Components
- [ ] Create AIActivityButton component
- [ ] Create AIActivityDropdown component
- [ ] Create AITaskItem component
- [ ] Create UserAvatarMenu component
- [ ] Update SiteHeader component

### Phase 5: Testing & Polish
- [ ] Test extraction queue integration
- [ ] Test analysis route integration
- [ ] Test real-time updates
- [ ] Test navigation from task items
- [ ] Add error handling for SSE disconnections
- [ ] Add cleanup job for old tasks
- [ ] Performance testing with multiple concurrent tasks

---

## 7. Design Decisions

### Why Server-Sent Events (SSE)?
- **One-way communication**: Server → Client (perfect for notifications)
- **Built-in reconnection**: Browsers automatically reconnect
- **Simple implementation**: Native EventSource API
- **Better than polling**: Reduces unnecessary requests
- **Better than WebSockets**: No need for bidirectional communication

### Why SQLite Polling for SSE?
- SQLite doesn't have native pub/sub
- Polling every 2 seconds is acceptable for this use case
- Future: Can switch to Redis pub/sub if scaling needed
- Keeps implementation simple for MVP

### Task Retention Policy
- Keep PENDING/PROCESSING tasks indefinitely
- Keep COMPLETED/FAILED tasks for 24 hours
- Cleanup job runs daily
- Users can still see recent completed tasks in dropdown

### Navigation Strategy
- Each task stores `navigationPath` and `navigationTab`
- Click redirects to job page with specific tab
- Extraction tasks initially point to /dashboard, updated after job creation
- Failed tasks still navigable (user can see job details)

---

## 8. Future Enhancements

### Phase 2 Features
- [ ] Browser notifications for completed tasks
- [ ] Task cancellation (for long-running analyses)
- [ ] Task priority management
- [ ] Batch operations (run multiple analyses)
- [ ] Export task history
- [ ] Analytics dashboard (time spent, success rate)

### Performance Optimizations
- [ ] Redis pub/sub for real-time updates at scale
- [ ] WebSocket fallback for SSE
- [ ] Task result caching
- [ ] Partial result streaming for long analyses

### UX Improvements
- [ ] Sound/vibration on task completion
- [ ] Estimated time remaining
- [ ] Task scheduling (run at specific time)
- [ ] Task templates (common analysis combinations)
- [ ] Keyboard shortcuts for task navigation

---

## UI/UX Notes

### Visual Design
- AI Activity button: Small square, Brain icon, pulse animation when active
- Badge: Red circle with white number (like notification badges)
- Dropdown: Clean white card, max height 96 (scrollable)
- Task items: Hover effect, clear status icons, truncated text
- Avatar: Circular gradient background, white letter, dropdown menu

### Interaction Patterns
- Click AI button → Opens dropdown
- Click task → Navigates to job/tab, closes dropdown
- Click outside → Closes dropdown
- Toggle "Active/All" → Fetches different data
- Real-time updates → Smooth animations, no jarring updates

### Accessibility
- Keyboard navigation for dropdown
- Screen reader announcements for task updates
- Focus management
- ARIA labels for icons
- Color contrast compliance
