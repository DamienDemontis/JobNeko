/**
 * Unified AI Task Tracking Service
 * Tracks all AI operations across the application with real-time status updates
 * NO FALLBACKS - Only real tracking of actual AI work
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum AITaskType {
  // Job Extraction
  JOB_EXTRACTION = 'JOB_EXTRACTION',

  // Analysis Types
  SALARY_ANALYSIS = 'SALARY_ANALYSIS',
  LOCATION_ANALYSIS = 'LOCATION_ANALYSIS',
  APPLICATION_STRATEGY = 'APPLICATION_STRATEGY',
  RESUME_OPTIMIZATION = 'RESUME_OPTIMIZATION',
  MATCH_CALCULATION = 'MATCH_CALCULATION',

  // Smart AI Components
  INTERVIEW_ANALYSIS = 'INTERVIEW_ANALYSIS',
  NETWORK_ANALYSIS = 'NETWORK_ANALYSIS',
  INSIDER_INTELLIGENCE = 'INSIDER_INTELLIGENCE',
  TIMELINE_ANALYSIS = 'TIMELINE_ANALYSIS',
  COMPANY_INTELLIGENCE = 'COMPANY_INTELLIGENCE',
  CULTURE_ANALYSIS = 'CULTURE_ANALYSIS',
  COMPETITIVE_ANALYSIS = 'COMPETITIVE_ANALYSIS',
  INTERVIEW_PIPELINE = 'INTERVIEW_PIPELINE',
  INTERVIEW_COACHING = 'INTERVIEW_COACHING',
  SMART_QUESTIONS = 'SMART_QUESTIONS',
  OUTREACH_GENERATION = 'OUTREACH_GENERATION',
  COMMUNICATION_GENERATION = 'COMMUNICATION_GENERATION',
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
  resultData?: any;

  // Navigation
  navigationPath: string;
  navigationTab?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTaskParams {
  userId: string;
  type: AITaskType;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  navigationPath: string;
  navigationTab?: string;
  estimatedDuration?: number;
}

interface UpdateProgressParams {
  progress?: number;
  currentStep?: string;
  status?: AITaskStatus;
}

class AITaskTrackerService {
  private static instance: AITaskTrackerService;

  static getInstance(): AITaskTrackerService {
    if (!AITaskTrackerService.instance) {
      AITaskTrackerService.instance = new AITaskTrackerService();
    }
    return AITaskTrackerService.instance;
  }

  /**
   * Create a new AI task
   */
  async createTask(params: CreateTaskParams): Promise<AITask> {
    const {
      userId,
      type,
      jobId,
      jobTitle,
      company,
      navigationPath,
      navigationTab,
      estimatedDuration,
    } = params;

    console.log(`📝 Creating AI task: ${type} for user ${userId}`);

    const task = await prisma.aITask.create({
      data: {
        userId,
        type,
        status: AITaskStatus.PENDING,
        jobId,
        jobTitle,
        company,
        navigationPath,
        navigationTab,
        estimatedDuration,
        progress: 0,
      },
    });

    console.log(`✅ AI task created: ${task.id}`);

    return this.mapToAITask(task);
  }

  /**
   * Update task progress
   */
  async updateProgress(
    taskId: string,
    params: UpdateProgressParams
  ): Promise<void> {
    const { progress, currentStep, status } = params;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (currentStep !== undefined) {
      updateData.currentStep = currentStep;
    }

    if (status !== undefined) {
      updateData.status = status;

      // Set startedAt when status becomes PROCESSING
      if (status === AITaskStatus.PROCESSING && !updateData.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    await prisma.aITask.update({
      where: { id: taskId },
      data: updateData,
    });

    console.log(`🔄 Task ${taskId} updated:`, params);
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string, result?: any): Promise<void> {
    await prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: AITaskStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        resultData: result ? JSON.stringify(result) : null,
        currentStep: undefined,
      },
    });

    console.log(`✅ Task ${taskId} completed`);
  }

  /**
   * Mark task as failed
   */
  async failTask(taskId: string, error: string): Promise<void> {
    await prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: AITaskStatus.FAILED,
        completedAt: new Date(),
        error,
      },
    });

    console.error(`❌ Task ${taskId} failed: ${error}`);
  }

  /**
   * Mark task as cached (instant return from cache)
   */
  async markAsCached(taskId: string): Promise<void> {
    await prisma.aITask.update({
      where: { id: taskId },
      data: {
        status: AITaskStatus.CACHED,
        progress: 100,
        completedAt: new Date(),
        currentStep: 'Returned from cache',
      },
    });

    console.log(`⚡ Task ${taskId} returned from cache`);
  }

  /**
   * Get user's active tasks (PENDING, PROCESSING)
   */
  async getActiveTasks(userId: string): Promise<AITask[]> {
    const tasks = await prisma.aITask.findMany({
      where: {
        userId,
        status: {
          in: [AITaskStatus.PENDING, AITaskStatus.PROCESSING],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tasks.map((task) => this.mapToAITask(task));
  }

  /**
   * Get user's recent tasks (all, including completed)
   */
  async getRecentTasks(userId: string, limit: number = 20): Promise<AITask[]> {
    const tasks = await prisma.aITask.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    });

    return tasks.map((task) => this.mapToAITask(task));
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<AITask | null> {
    const task = await prisma.aITask.findUnique({
      where: { id: taskId },
    });

    return task ? this.mapToAITask(task) : null;
  }

  /**
   * Update navigation path (useful for extraction queue after job is created)
   */
  async updateNavigation(
    taskId: string,
    navigationPath: string,
    navigationTab?: string
  ): Promise<void> {
    await prisma.aITask.update({
      where: { id: taskId },
      data: {
        navigationPath,
        navigationTab,
      },
    });

    console.log(`🧭 Task ${taskId} navigation updated: ${navigationPath}`);
  }

  /**
   * Clean up old completed tasks
   */
  async cleanupOldTasks(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await prisma.aITask.deleteMany({
      where: {
        status: {
          in: [AITaskStatus.COMPLETED, AITaskStatus.FAILED, AITaskStatus.CACHED],
        },
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} old AI tasks`);

    return result.count;
  }

  /**
   * Get count of active tasks for a user
   */
  async getActiveTaskCount(userId: string): Promise<number> {
    return await prisma.aITask.count({
      where: {
        userId,
        status: {
          in: [AITaskStatus.PENDING, AITaskStatus.PROCESSING],
        },
      },
    });
  }

  /**
   * Map Prisma model to AITask interface
   */
  private mapToAITask(task: any): AITask {
    return {
      id: task.id,
      userId: task.userId,
      type: task.type as AITaskType,
      status: task.status as AITaskStatus,
      jobId: task.jobId || undefined,
      jobTitle: task.jobTitle || undefined,
      company: task.company || undefined,
      progress: task.progress,
      currentStep: task.currentStep || undefined,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
      estimatedDuration: task.estimatedDuration || undefined,
      error: task.error || undefined,
      resultData: task.resultData ? JSON.parse(task.resultData) : undefined,
      navigationPath: task.navigationPath,
      navigationTab: task.navigationTab || undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}

// Singleton instance
export const aiTaskTracker = AITaskTrackerService.getInstance();
