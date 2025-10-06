/**
 * Extraction Queue Service
 * Manages background job extractions with progress tracking
 */

import { prisma } from '@/lib/prisma';
import { extractJobDataWithAI } from '@/lib/ai-service';
import { ExtractionStatus, ExtractionQueue } from '@prisma/client';

export interface ExtractionProgress {
  id: string;
  url: string;
  status: ExtractionStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

class ExtractionQueueService {
  private static instance: ExtractionQueueService;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ExtractionQueueService {
    if (!ExtractionQueueService.instance) {
      ExtractionQueueService.instance = new ExtractionQueueService();
    }
    return ExtractionQueueService.instance;
  }

  /**
   * Add a job URL to the extraction queue
   * @param preExtractedHtml - Optional HTML content extracted by browser extension (bypasses 403 errors)
   */
  async addToQueue(userId: string, url: string, priority = 0, preExtractedHtml?: string): Promise<ExtractionQueue | { isDuplicate: true; existingJobId: string; message: string }> {
    // Check if job already exists (successfully extracted)
    const existingJob = await prisma.job.findFirst({
      where: {
        userId,
        url
      },
      select: {
        id: true,
        title: true,
        company: true,
        createdAt: true
      }
    });

    if (existingJob) {
      // Return duplicate info instead of throwing error
      return {
        isDuplicate: true,
        existingJobId: existingJob.id,
        message: `This job has already been extracted on ${new Date(existingJob.createdAt).toLocaleDateString()}.`
      } as any;
    }

    // Check if URL is already in queue for this user
    const existingInQueue = await prisma.extractionQueue.findFirst({
      where: {
        userId,
        url,
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      }
    });

    if (existingInQueue) {
      return existingInQueue;
    }

    // Create new queue entry with optional pre-extracted HTML
    const queueEntry = await prisma.extractionQueue.create({
      data: {
        userId,
        url,
        priority,
        status: 'PENDING',
        result: preExtractedHtml ? { preExtractedHtml } : null // Store HTML in result field
      }
    });

    console.log(`✅ Queue entry created${preExtractedHtml ? ' with pre-extracted HTML' : ''}`);

    // Start processing if not already running
    this.startProcessing();

    return queueEntry;
  }

  /**
   * Add multiple URLs to the queue
   */
  async addBatchToQueue(userId: string, urls: string[]): Promise<ExtractionQueue[]> {
    const queueEntries = await Promise.all(
      urls.map(url => this.addToQueue(userId, url))
    );
    return queueEntries;
  }

  /**
   * Get user's extraction queue status
   */
  async getUserQueue(userId: string): Promise<ExtractionProgress[]> {
    const queue = await prisma.extractionQueue.findMany({
      where: { userId },
      orderBy: [
        { createdAt: 'desc' } // Newest first (chronological order)
      ]
    });

    return queue.map(item => ({
      id: item.id,
      url: item.url,
      status: item.status,
      progress: item.progress,
      currentStep: item.currentStep,
      error: item.error,
      result: item.result,
      startedAt: item.startedAt,
      completedAt: item.completedAt
    }));
  }

  /**
   * Get a specific extraction status
   */
  async getExtractionStatus(id: string, userId: string): Promise<ExtractionProgress | null> {
    const item = await prisma.extractionQueue.findFirst({
      where: { id, userId }
    });

    if (!item) return null;

    return {
      id: item.id,
      url: item.url,
      status: item.status,
      progress: item.progress,
      currentStep: item.currentStep,
      error: item.error,
      startedAt: item.startedAt,
      completedAt: item.completedAt
    };
  }

  /**
   * Start processing the queue
   */
  private startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Stop processing the queue
   */
  stopProcessing() {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the extraction queue
   */
  private async processQueue() {
    try {
      // Get next pending item
      const nextItem = await prisma.extractionQueue.findFirst({
        where: {
          status: 'PENDING'
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      if (!nextItem) {
        // Check for retry items
        const retryItem = await prisma.extractionQueue.findFirst({
          where: {
            status: 'RETRY',
            retryCount: {
              lt: prisma.extractionQueue.fields.maxRetries
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ]
        });

        if (!retryItem) {
          // No items to process, stop processing
          this.stopProcessing();
          return;
        }

        await this.processItem(retryItem);
      } else {
        await this.processItem(nextItem);
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }

  /**
   * Process a single extraction item
   */
  private async processItem(item: ExtractionQueue) {
    try {
      // Get user's API key (handles encryption and platform fallback securely)
      const { getUserApiKey } = await import('@/lib/utils/api-key-helper');
      const apiKey = await getUserApiKey(item.userId);

      // Update status to processing
      await prisma.extractionQueue.update({
        where: { id: item.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          progress: 10,
          currentStep: 'Starting extraction...'
        }
      });

      // Check if we have pre-extracted HTML from browser extension
      let html: string;
      const preExtractedHtml = (item.result as any)?.preExtractedHtml;

      if (preExtractedHtml) {
        console.log('✅ Using pre-extracted HTML from browser extension');
        html = preExtractedHtml;
        await this.updateProgress(item.id, 25, 'Using pre-extracted content...');
      } else {
        // Fetch page content with proper headers to avoid 403 errors
        await this.updateProgress(item.id, 25, 'Fetching page content...');
        console.log('⬇️ Fetching HTML from URL...');

        const response = await fetch(item.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
        }
        html = await response.text();
      }

      await this.updateProgress(item.id, 40, 'Parsing page content...');

      // Extract text content from HTML
      const textMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyHtml = textMatch ? textMatch[1] : html;
      const text = bodyHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000); // Limit to 10k chars

      // Extract title from HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Look for JSON-LD structured data
      const structuredDataMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      let structured: any = {};
      for (const match of structuredDataMatches) {
        try {
          const data = JSON.parse(match[1]);
          if (data['@type'] === 'JobPosting') {
            structured = data;
            break;
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      }

      await this.updateProgress(item.id, 60, 'Extracting job data with AI...');

      // COMPREHENSIVE LOGO EXTRACTION from entire HTML
      const logoUrl = this.extractCompanyLogo(html, item.url);

      console.log('🔍 Logo extraction result:', {
        url: item.url,
        logoUrl: logoUrl,
        htmlLength: html.length
      });

      // Extract job data using AI with full context
      // Send MORE HTML to give AI better chance to find logo
      const extractedData = await extractJobDataWithAI({
        url: item.url,
        html: html.substring(0, 80000), // Increased to 80k chars for better logo detection
        text: text,
        title: title,
        structured: structured
      }, apiKey); // Pass user's API key

      // Use manual extraction as fallback ONLY if AI failed
      if (!extractedData.companyLogoUrl && logoUrl) {
        extractedData.companyLogoUrl = logoUrl;
        console.log('⚠️ AI failed to extract logo, using fallback extraction:', logoUrl);
      } else if (extractedData.companyLogoUrl) {
        console.log('✅ AI successfully extracted logo:', extractedData.companyLogoUrl);
      } else {
        console.log('❌ No logo found by AI or fallback extraction');
      }

      console.log('Extracted job data:', {
        title: extractedData.title,
        company: extractedData.company,
        companyLogoUrl: extractedData.companyLogoUrl,
        location: extractedData.location,
        salary: extractedData.salary,
        hasDescription: !!extractedData.description,
        descriptionLength: extractedData.description?.length || 0,
        requirementsCount: extractedData.requirements?.length || 0
      });

      await this.updateProgress(item.id, 80, 'Processing extracted data...');

      // Save the job
      const job = await prisma.job.create({
        data: {
          userId: item.userId,
          url: item.url,
          title: extractedData.title || 'Untitled Job',
          company: extractedData.company || 'Unknown Company',
          companyLogoUrl: extractedData.companyLogoUrl || null,
          location: extractedData.location,
          salary: extractedData.salary,
          salaryMin: extractedData.salaryMin,
          salaryMax: extractedData.salaryMax,
          salaryCurrency: extractedData.salaryCurrency,
          description: extractedData.description || '',
          requirements: extractedData.requirements || '',
          skills: extractedData.skills && Array.isArray(extractedData.skills)
            ? extractedData.skills.join(', ')
            : typeof extractedData.skills === 'string'
              ? extractedData.skills
              : '',
          summary: extractedData.summary || '',
          workMode: extractedData.workMode,
          contractType: extractedData.contractType,
          extractedData: JSON.stringify(extractedData),
          extractedAt: new Date()
        }
      });

      // Trigger auto-analysis based on user preferences
      const { autoAnalysisService } = await import('./auto-analysis-service');
      autoAnalysisService.triggerAutoAnalysis({
        userId: item.userId,
        jobId: job.id,
        jobData: {
          title: job.title,
          company: job.company,
          description: job.description || undefined,
          requirements: job.requirements || undefined,
          location: job.location || undefined,
          salary: job.salary || undefined,
        }
      }).catch(error => {
        console.error('Auto-analysis trigger failed:', error);
        // Don't fail the extraction if auto-analysis fails
      });

      // Mark as completed
      await prisma.extractionQueue.update({
        where: { id: item.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Extraction complete',
          completedAt: new Date(),
          result: { jobId: job.id }
        }
      });

      // Broadcast completion (will be handled by WebSocket/SSE)
      this.broadcastUpdate(item.userId, {
        id: item.id,
        status: 'COMPLETED',
        progress: 100,
        jobId: job.id
      });

    } catch (error) {
      console.error(`Extraction failed for ${item.url}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const shouldRetry = item.retryCount < item.maxRetries;

      await prisma.extractionQueue.update({
        where: { id: item.id },
        data: {
          status: shouldRetry ? 'RETRY' : 'FAILED',
          error: errorMessage,
          retryCount: item.retryCount + 1,
          currentStep: shouldRetry ? 'Scheduled for retry...' : 'Extraction failed'
        }
      });

      this.broadcastUpdate(item.userId, {
        id: item.id,
        status: shouldRetry ? 'RETRY' : 'FAILED',
        error: errorMessage
      });
    }
  }

  /**
   * Extract company logo from HTML using comprehensive pattern matching
   */
  private extractCompanyLogo(html: string, pageUrl: string): string | null {
    try {
      const urlObj = new URL(pageUrl);
      const domain = urlObj.origin;

      // Strategy 1: Look for Open Graph image (og:image)
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogImageMatch) {
        const ogUrl = this.makeAbsoluteUrl(ogImageMatch[1], domain);
        // Only use if it looks like a logo (not a banner/hero image)
        if (this.looksLikeLogo(ogImageMatch[1])) {
          return ogUrl;
        }
      }

      // Strategy 2: Look for JSON-LD organization logo
      const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          if (data.logo?.url) {
            return this.makeAbsoluteUrl(data.logo.url, domain);
          }
          if (data.logo && typeof data.logo === 'string') {
            return this.makeAbsoluteUrl(data.logo, domain);
          }
          if (data.image?.url && data['@type'] === 'Organization') {
            return this.makeAbsoluteUrl(data.image.url, domain);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      // Strategy 3: Find ALL images and score them
      const imgMatches = html.matchAll(/<img[^>]*>/gi);
      const candidates: Array<{ url: string; score: number; element: string }> = [];

      for (const match of imgMatches) {
        const imgTag = match[0];
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);

        if (!srcMatch) continue;

        const src = srcMatch[1];
        let score = 0;

        // Score based on attributes
        const classAttr = imgTag.match(/class=["']([^"']+)["']/i)?.[1] || '';
        const idAttr = imgTag.match(/id=["']([^"']+)["']/i)?.[1] || '';
        const altAttr = imgTag.match(/alt=["']([^"']+)["']/i)?.[1] || '';

        // High score for logo-related classes/ids
        if (/logo|brand|company-logo|header-logo|site-logo/i.test(classAttr)) score += 100;
        if (/logo|brand/i.test(idAttr)) score += 100;
        if (/logo|brand/i.test(altAttr)) score += 80;

        // Score based on URL path
        if (/logo|brand|company/i.test(src)) score += 50;

        // Bonus for being in likely header/nav areas (first 20% of HTML)
        const position = html.indexOf(imgTag);
        if (position < html.length * 0.2) score += 30;

        // Penalty for large images (likely banners)
        const widthMatch = imgTag.match(/width=["']?(\d+)/i);
        const heightMatch = imgTag.match(/height=["']?(\d+)/i);
        if (widthMatch && parseInt(widthMatch[1]) > 500) score -= 30;
        if (heightMatch && parseInt(heightMatch[1]) > 300) score -= 30;

        // Penalty for job listing or hero images
        if (/hero|banner|job-photo|listing|thumbnail/i.test(classAttr)) score -= 50;

        // Only consider candidates with positive score
        if (score > 0) {
          candidates.push({
            url: this.makeAbsoluteUrl(src, domain),
            score,
            element: imgTag
          });
        }
      }

      // Return highest scoring candidate
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        console.log('🎯 Logo candidates:', candidates.slice(0, 3).map(c => ({ url: c.url, score: c.score })));
        return candidates[0].url;
      }

      return null;
    } catch (error) {
      console.error('Logo extraction error:', error);
      return null;
    }
  }

  /**
   * Check if URL looks like a logo
   */
  private looksLikeLogo(url: string): boolean {
    const lower = url.toLowerCase();
    if (lower.includes('logo') || lower.includes('brand')) return true;
    if (lower.includes('hero') || lower.includes('banner') || lower.includes('cover')) return false;
    return false;
  }

  /**
   * Convert relative URL to absolute
   */
  private makeAbsoluteUrl(url: string, domain: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      return domain + url;
    }
    // Relative path
    return domain + '/' + url;
  }

  /**
   * Update extraction progress
   */
  private async updateProgress(id: string, progress: number, step: string) {
    await prisma.extractionQueue.update({
      where: { id },
      data: {
        progress,
        currentStep: step
      }
    });
  }

  /**
   * Broadcast update to user via long-polling and SSE
   */
  private broadcastUpdate(userId: string, update: any) {
    console.log(`Broadcasting to user ${userId}:`, update);

    // Broadcast via long-polling and SSE if available (server-side only)
    if (typeof window === 'undefined') {
      try {
        // Notify long-polling watchers
        import('@/app/api/extraction/queue/watch/route').then(module => {
          if (module.notifyQueueUpdate) {
            module.notifyQueueUpdate(userId, update);
          }
        }).catch(() => {
          // Long-polling not available
        });

        // Also notify SSE connections
        import('@/app/api/extraction/queue/stream/route').then(module => {
          if (module.broadcastToUser) {
            module.broadcastToUser(userId, update);
          }
        }).catch(() => {
          // SSE not available
        });
      } catch {
        // Broadcast not available
      }
    }
  }

  /**
   * Clean up old completed/failed items (run periodically)
   */
  async cleanupOldItems(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await prisma.extractionQueue.deleteMany({
      where: {
        status: {
          in: ['COMPLETED', 'FAILED']
        },
        completedAt: {
          lt: cutoffDate
        }
      }
    });
  }
}

export const extractionQueue = ExtractionQueueService.getInstance();