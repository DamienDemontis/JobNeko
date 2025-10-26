/**
 * Auto-Analysis Service
 * Automatically triggers AI analyses after job extraction based on user preferences
 */

import { aiExecutor, AIOperationType } from './ai-executor';
import { prisma } from '@/lib/prisma';

interface AutoAnalysisOptions {
  userId: string;
  jobId: string;
  jobData: {
    title: string;
    company: string;
    description?: string;
    requirements?: string;
    location?: string;
    salary?: string;
  };
}

export class AutoAnalysisService {
  /**
   * Trigger auto-analysis based on user preferences
   */
  async triggerAutoAnalysis(options: AutoAnalysisOptions): Promise<void> {
    try {
      // Get user preferences
      const profile = await prisma.userProfile.findUnique({
        where: { userId: options.userId },
        include: {
          preferences: true,
          user: {
            include: {
              resumes: {
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!profile?.preferences) {
        console.log('No preferences found for user, skipping auto-analysis');
        return;
      }

      const prefs = profile.preferences;

      // Check if auto-analysis is enabled
      if (!prefs.autoAnalyzeAfterExtraction) {
        console.log('Auto-analysis disabled for user');
        return;
      }

      // Get user's subscription tier for permission checking
      const subscriptionTier = profile.user.subscriptionTier || 'free';

      // Prepare list of operations to run
      const operations: { type: AIOperationType; enabled: boolean }[] = [
        { type: 'match_score', enabled: prefs.autoMatchScore },
        { type: 'salary_analysis', enabled: prefs.autoSalaryAnalysis },
        { type: 'company_research', enabled: prefs.autoCompanyResearch },
        { type: 'skills_gap', enabled: prefs.autoSkillGapAnalysis },
        { type: 'interview_prep', enabled: prefs.autoInterviewPrep },
      ];

      // Filter enabled operations
      const enabledOperations = operations.filter(op => op.enabled);

      if (enabledOperations.length === 0) {
        console.log('No specific analyses enabled for auto-run');
        return;
      }

      console.log(`🤖 Auto-analyzing job ${options.jobId} with ${enabledOperations.length} operations`);

      // Prepare base data for all operations
      const baseData = {
        jobTitle: options.jobData.title,
        jobCompany: options.jobData.company,
        jobDescription: options.jobData.description || '',
        jobRequirements: options.jobData.requirements || '',
        jobLocation: options.jobData.location || '',
        userProfile: profile,
      };

      // Add resume data if needed for match score or skills gap
      const needsResume = enabledOperations.some(op =>
        op.type === 'match_score' || op.type === 'skills_gap'
      );

      let resumeData: any = {};
      if (needsResume && profile.user.resumes[0]) {
        const resume = profile.user.resumes[0];
        let resumeSkills: any[] = [];
        try {
          if (resume.skills) resumeSkills = JSON.parse(resume.skills);
        } catch (error) {
          console.warn('Failed to parse resume skills:', error);
        }

        resumeData = {
          resumeText: resume.content || '',
          resumeSkills,
          userSkills: resumeSkills,
        };
      }

      // Run all enabled operations in parallel
      const promises = enabledOperations.map(async (op) => {
        try {
          console.log(`  📊 Running ${op.type} analysis...`);

          const operationData = {
            ...baseData,
            ...resumeData,
            salary: options.jobData.salary,
          };

          const result = await aiExecutor.execute({
            userId: options.userId,
            jobId: options.jobId,
            operation: op.type,
            data: operationData,
            forceRefresh: false, // Use cache if available
            subscriptionTier,
          });

          if (result.success) {
            console.log(`  ✅ ${op.type} completed ${result.cached ? '(cached)' : ''}`);
          } else {
            console.error(`  ❌ ${op.type} failed: ${result.error}`);
          }

          return result;
        } catch (error) {
          console.error(`  ❌ ${op.type} error:`, error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      // Wait for all operations to complete
      const results = await Promise.allSettled(promises);

      // Log summary
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log(`🎯 Auto-analysis complete: ${successful} succeeded, ${failed} failed`);

      // Send notification if enabled
      if (prefs.notifyOnAnalysis && prefs.browserNotifications) {
        // TODO: Implement browser notification
        console.log('Browser notification would be sent here');
      }

    } catch (error) {
      console.error('Auto-analysis error:', error);
    }
  }

  /**
   * Check if a specific operation should run for a user
   */
  async shouldRunOperation(
    userId: string,
    operation: AIOperationType
  ): Promise<boolean> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: { preferences: true }
      });

      if (!profile?.preferences?.autoAnalyzeAfterExtraction) {
        return false;
      }

      const prefs = profile.preferences;

      switch (operation) {
        case 'match_score':
          return prefs.autoMatchScore;
        case 'salary_analysis':
          return prefs.autoSalaryAnalysis;
        case 'company_research':
          return prefs.autoCompanyResearch;
        case 'skills_gap':
          return prefs.autoSkillGapAnalysis;
        case 'interview_prep':
          return prefs.autoInterviewPrep;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking operation preference:', error);
      return false;
    }
  }
}

// Export singleton instance
export const autoAnalysisService = new AutoAnalysisService();