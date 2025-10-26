# Centralized Resume Matching System

## Overview

The Resume Matching System is a comprehensive, subscription-tier aware service that calculates how well a user's resume matches a job posting. It's designed to be:

- **Centralized**: Single source of truth for all matching calculations
- **Intelligent**: AI-powered analysis with no fallback scores
- **Subscription-Ready**: Built with tiered features from day one
- **Performant**: Intelligent caching and batch processing
- **Transparent**: Clear confidence scores and detailed breakdowns

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│              Centralized Match Service                       │
│  (lib/services/centralized-match-service.ts)                │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
     ┌──────────▼────────┐   ┌─────────▼──────────┐
     │ Subscription Tiers │   │ Resume Matching    │
     │   Management       │   │   Service          │
     └────────────────────┘   └────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        │                             │
              ┌─────────▼──────────┐      ┌──────────▼─────────┐
              │ Skills Gap         │      │ Unified AI         │
              │ Analysis           │      │ Service            │
              └────────────────────┘      └────────────────────┘
```

### Files

1. **`lib/services/centralized-match-service.ts`**
   - Main matching service
   - Entry point for all matching operations
   - Handles caching, batch processing, tier logic

2. **`lib/services/subscription-tiers.ts`**
   - Subscription tier definitions (FREE, PRO, PRO_MAX)
   - Feature limits per tier
   - Access control logic

3. **`lib/services/resume-matching-service.ts`**
   - Detailed resume analysis
   - Component scoring (skills, experience, education, etc.)
   - Improvement recommendations

4. **`lib/services/skills-gap-analysis.ts`**
   - Skills gap identification
   - Learning path recommendations
   - Salary impact calculations

## Subscription Tiers

### FREE Tier
- **Match Analysis**: Basic (simple percentage score)
- **Features**:
  - Basic match score (0-100%)
  - Component breakdown (skills, experience, education, keywords, achievements)
  - 50 jobs maximum
  - 7-day cache
- **Best For**: Individual job seekers starting out

### PRO Tier ($9.99/month)
- **Match Analysis**: Standard (includes detailed analysis)
- **Features**:
  - Everything in FREE
  - Skills gap analysis with learning paths
  - Improvement plan (quick wins, short-term, long-term)
  - ATS compatibility check
  - Tailoring recommendations
  - Strengths analysis
  - 500 jobs maximum
  - Batch operations
  - 24-hour cache
  - Web search for company intelligence
- **Best For**: Active job seekers

### PRO MAX Tier ($24.99/month)
- **Match Analysis**: Comprehensive (full detailed breakdown)
- **Features**:
  - Everything in PRO
  - Unlimited jobs
  - Priority processing
  - 1-hour cache (near real-time)
  - Custom reports
  - Priority support
- **Best For**: Professional recruiters, career coaches, power users

## Usage

### Basic Match Calculation

```typescript
import { centralizedMatchService } from '@/lib/services/centralized-match-service';

const matchResult = await centralizedMatchService.calculateMatch({
  userId: 'user_123',
  jobId: 'job_456',
  resumeContent: '...resume text...',
  resumeSkills: ['JavaScript', 'React', 'Node.js'],
  jobTitle: 'Senior Full Stack Developer',
  jobCompany: 'Tech Corp',
  jobDescription: '...job description...',
  jobRequirements: '...requirements...',
  jobSkills: ['React', 'TypeScript', 'AWS']
});

console.log(`Match Score: ${matchResult.matchScore}%`);
console.log(`Confidence: ${matchResult.confidence * 100}%`);
console.log(`Tier: ${matchResult.tier}`);
```

### Batch Processing (PRO/PRO_MAX only)

```typescript
const matchResults = await centralizedMatchService.batchCalculateMatches(
  userId,
  resumeContent,
  jobs // Array of job objects
);

// Process results
for (const [jobId, matchResult] of matchResults) {
  console.log(`Job ${jobId}: ${matchResult.matchScore}%`);
}
```

## API Endpoints

### POST /api/jobs/[id]/calculate-match

Calculate or recalculate match score for a specific job.

**Request:**
```bash
curl -X POST https://api.example.com/api/jobs/job_123/calculate-match \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "matchScore": 82,
  "confidence": 0.85,
  "tier": "free",
  "components": {
    "skills": 85,
    "experience": 78,
    "education": 90,
    "keywords": 75,
    "achievements": 80
  },
  "detailedAnalysis": null,
  "calculatedAt": "2025-10-01T10:00:00Z",
  "dataSources": ["ai_analysis"]
}
```

### POST /api/jobs/rematch

Recalculate match scores for all user's jobs.

**Request:**
```bash
curl -X POST https://api.example.com/api/jobs/rematch \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Job matching completed",
  "totalJobs": 25,
  "updatedJobs": 25,
  "skippedJobs": 0
}
```

## Match Score Components

### Overall Score Calculation

The overall match score is a weighted average:

```
Overall Score = (
  Skills Score × 30% +
  Experience Score × 25% +
  Education Score × 15% +
  Achievements Score × 20% +
  Keywords Score × 10%
) / 100
```

### Component Descriptions

1. **Skills Score (30%)**
   - Measures technical and soft skills alignment
   - Compares resume skills against job requirements
   - Accounts for skill proficiency levels

2. **Experience Score (25%)**
   - Years of experience vs requirements
   - Relevant industry experience
   - Career progression alignment

3. **Education Score (15%)**
   - Degree level and field match
   - Relevant certifications
   - Flexible if "equivalent experience" is acceptable

4. **Achievements Score (20%)**
   - Quantified accomplishments
   - Impact and scale of past work
   - Relevance to job responsibilities

5. **Keywords Score (10%)**
   - Job posting keywords in resume
   - Industry-specific terminology
   - ATS optimization

## Caching Strategy

To optimize performance and costs:

- **FREE Tier**: 7-day cache
- **PRO Tier**: 24-hour cache
- **PRO_MAX Tier**: 1-hour cache

Cache keys are generated from:
- User ID
- Job ID (if available)
- Job title and company
- Hash of resume content

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic matching with subscription tiers
- ✅ Component scoring
- ✅ Caching system
- ✅ Batch processing

### Phase 2 (Q1 2026)
- [ ] User subscription management UI
- [ ] Payment integration (Stripe)
- [ ] Usage analytics dashboard
- [ ] Export match reports (PDF)

### Phase 3 (Q2 2026)
- [ ] ML-based match prediction
- [ ] Historical match accuracy tracking
- [ ] A/B testing for match algorithms
- [ ] API rate limiting per tier

### Phase 4 (Q3 2026)
- [ ] Resume optimization suggestions
- [ ] Interview question predictions
- [ ] Salary negotiation coaching
- [ ] Network referral matching

## Best Practices

### For Developers

1. **Always use centralized service**: Never calculate match scores directly
2. **Handle errors gracefully**: Matching might fail - have fallback UI
3. **Show loading states**: Matching can take 3-10 seconds
4. **Cache aggressively**: Respect tier cache durations
5. **Log everything**: Match calculations are expensive - track usage

### For Users

1. **Keep resume updated**: Match scores reflect current resume
2. **Upload complete resume**: More data = better matching
3. **Rematch after resume updates**: Use `/api/jobs/rematch` endpoint
4. **Trust the confidence score**: Low confidence = uncertain match
5. **Review component breakdown**: Identify specific gaps

## Monitoring

Key metrics to track:

- **Match calculation time**: Should be < 10s for basic, < 30s for comprehensive
- **Cache hit rate**: Target > 70% for FREE, > 50% for PRO
- **Confidence distribution**: Most matches should have > 0.7 confidence
- **Component score variance**: Identifies systematic biases
- **Tier usage**: Which features are most valuable

## Troubleshooting

### Match score is 0
- Verify resume has content
- Check job has description and requirements
- Review API logs for errors

### Match score seems wrong
- Check confidence score (low confidence = uncertain)
- Review component breakdown for specific issues
- Verify resume and job data quality

### Slow performance
- Check cache hit rates
- Consider tier upgrade for faster cache expiration
- Verify batch processing for multiple jobs

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@example.com
- Documentation: https://docs.example.com
