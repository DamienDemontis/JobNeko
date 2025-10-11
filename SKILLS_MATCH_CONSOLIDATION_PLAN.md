# Skills Match Consolidation Plan

## Problem Statement

Currently, we have **3 different skills match calculations** happening independently:

1. **Overview Tab** - Resume Match Score via `centralizedMatchService.calculateMatch()`
   - Uses `resume-matching-service.ts`
   - Provides basic matching with components (skills, keywords, experience, education, achievements)

2. **Salary Intel Tab** - "Detailed Skills Match" via AI prompt in salary analysis
   - **THIS IS THE BEST ONE** ✅
   - Includes `partialMatches` (skills where resume shows related/similar but not exact match)
   - Has `matchingSkills`, `missingSkills`, `partialMatches`, and `matchExplanation`
   - More nuanced and accurate scoring

3. **Application Tab** - Match calculation via `centralizedMatchService.calculateMatch()`
   - Same as Overview tab
   - Used for ATS optimization recommendations

**Issues:**
- Different scores across tabs (confusing for users)
- Duplicate AI calls (expensive, slower)
- The best algorithm (Salary Intel) is only available in one tab
- No single source of truth

## Recommended Solution

**Create a new unified skills matching system** that:

1. **Replaces all 3 current implementations** with a single authoritative service
2. **Uses the Salary Intel algorithm** as the base (partial matches, detailed breakdown)
3. **Caches results** in the database for reuse across all tabs
4. **Provides both summary scores AND detailed breakdown** for different use cases

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         New: Enhanced Skills Match Service              │
│  (lib/services/enhanced-skills-match-service.ts)        │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Stores in job.matchAnalysis
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Database Cache Layer                        │
│  - Cached in job.matchAnalysis JSON field               │
│  - TTL: 48 hours (recalculate if resume changes)        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Overview Tab │  │ Salary Tab   │  │ Application  │
│              │  │              │  │     Tab      │
│ - Score      │  │ - Full       │  │ - ATS Opts   │
│ - Components │  │   Breakdown  │  │ - Keywords   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## New Data Structure

```typescript
interface EnhancedSkillsMatch {
  // Summary (for Overview tab)
  overallScore: number;              // 0-100, weighted score
  confidence: number;                // 0-1

  // Detailed Breakdown (for Salary & Application tabs)
  matchingSkills: string[];          // Exact matches
  missingSkills: string[];           // Required but not in resume
  partialMatches: string[];          // Similar/related skills
  matchExplanation: string;          // Human-readable explanation

  // Component Scores (for compatibility)
  components: {
    skills: number;                  // Technical skills match %
    keywords: number;                // Job description keywords %
    experience: number;              // Experience level match %
    education: number;               // Education requirements %
    achievements: number;            // Quantifiable achievements %
  };

  // ATS Optimization (for Application tab)
  atsKeywords: {
    matched: string[];               // Keywords found in resume
    missing: string[];               // Keywords missing from resume
    recommendations: string[];       // Specific optimization tips
  };

  // Metadata
  calculatedAt: Date;
  resumeId: string;                  // Track which resume was used
  cacheKey: string;
}
```

## Implementation Steps

### Phase 1: Create Enhanced Skills Match Service ✅

**File:** `lib/services/enhanced-skills-match-service.ts`

**Features:**
- Single method: `calculateEnhancedMatch(input)`
- Uses GPT-5 with the Salary Intel prompt (already proven effective)
- Includes partial match logic
- Caches in `job.matchAnalysis` JSON field
- Returns structured `EnhancedSkillsMatch` data

**Benefits:**
- Reuses the BEST algorithm (from Salary Intel)
- No quality degradation
- Actually improves quality for Overview & Application tabs

### Phase 2: Update Database Schema ✅

**Current:**
```prisma
model Job {
  matchScore      Float?
  matchAnalysis   String?  // JSON - currently used by centralizedMatchService
}
```

**Action:**
- Keep existing fields (backwards compatible)
- Store new enhanced match in `matchAnalysis` with version tag
- Add `matchAnalysisVersion` field to track format

**Migration:**
```prisma
model Job {
  matchScore            Float?
  matchAnalysis         String?  // Enhanced format with version
  matchAnalysisVersion  Int?     // 1 = old format, 2 = enhanced format
  matchResumeId         String?  // Track which resume was used
}
```

### Phase 3: Integrate into Each Tab

#### A. Overview Tab (Match Score Card)
**File:** `app/api/jobs/[id]/calculate-match/route.ts`

**Changes:**
1. Replace `centralizedMatchService.calculateMatch()`
2. Call `enhancedSkillsMatchService.calculateMatch()`
3. Return `overallScore` and `components` for display

**UI Impact:** ✅ None - same data, better quality

#### B. Salary Intel Tab
**File:** `app/api/jobs/[id]/enhanced-salary-analysis/route.ts`

**Current:** Does its own AI skills analysis (lines 339-400)

**Changes:**
1. Call `enhancedSkillsMatchService.calculateMatch()` ONCE
2. Pass the cached result to AI prompt instead of asking AI to calculate
3. Remove redundant skills analysis from prompt
4. AI uses pre-calculated skills breakdown for salary analysis

**Benefits:**
- Faster (skip duplicate AI call)
- Consistent (same match score across tabs)
- Cheaper (one AI call instead of two)

**Prompt Changes:**
```diff
- **IMPORTANT:** You MUST use the resume content and skills above to analyze skill matches.
+ **SKILLS MATCH ANALYSIS (Pre-calculated):**
+ - Overall Match Score: ${skillsMatch.overallScore}%
+ - Matching Skills: ${skillsMatch.matchingSkills.join(', ')}
+ - Missing Skills: ${skillsMatch.missingSkills.join(', ')}
+ - Partial Matches: ${skillsMatch.partialMatches.join(', ')}
+ - Explanation: ${skillsMatch.matchExplanation}
+
+ USE THESE EXACT VALUES in your response. Do NOT recalculate skills match.
```

#### C. Application Strategy Tab
**File:** `app/api/jobs/[id]/application-strategy-analysis/route.ts`

**Current:** Calls `centralizedMatchService.calculateMatch()` (line 212)

**Changes:**
1. Replace with `enhancedSkillsMatchService.calculateMatch()`
2. Use `atsKeywords` field for ATS optimization
3. Pass detailed skills breakdown to AI

**Benefits:**
- Better ATS recommendations (knows exact missing keywords)
- Consistent match score with other tabs

### Phase 4: Deprecate Old System

**Files to Update:**
1. ✅ Keep `centralized-match-service.ts` but mark as deprecated
2. ✅ Redirect all calls to new enhanced service
3. ✅ Add migration path for old cached data

**OR** (cleaner approach):

1. ❌ Delete `centralized-match-service.ts`
2. ❌ Delete `resume-matching-service.ts`
3. ✅ Update all imports to new service

## Cache Invalidation Strategy

**Recalculate match when:**
1. User uploads new resume
2. User manually clicks "Recalculate Match"
3. Cache is older than 48 hours
4. Resume ID in cache ≠ current active resume ID

**Implementation:**
```typescript
async shouldRecalculate(job: Job, currentResumeId: string): Promise<boolean> {
  if (!job.matchAnalysis) return true;

  const cached = JSON.parse(job.matchAnalysis);

  // Resume changed
  if (cached.resumeId !== currentResumeId) return true;

  // Cache expired
  const age = Date.now() - new Date(cached.calculatedAt).getTime();
  if (age > 48 * 60 * 60 * 1000) return true;

  return false;
}
```

## AI Task Tracking Integration

**Create ONE AI task** for skills match calculation:
- Type: `MATCH_CALCULATION`
- Shows in AI Activity Monitor
- Estimated duration: 15-20 seconds

**All 3 tabs benefit from same task:**
- First tab to request: Creates task + does calculation
- Other tabs: Retrieve from cache (marked as CACHED)

## Testing Strategy

### Unit Tests
1. Test enhanced match calculation with various resumes
2. Test partial match detection
3. Test cache hit/miss scenarios
4. Test resume change detection

### Integration Tests
1. Calculate match once → verify all 3 tabs show same score
2. Change resume → verify recalculation triggers
3. Force refresh → verify cache bypass

### Manual Testing Checklist
- [ ] Overview tab shows match score
- [ ] Salary tab shows detailed breakdown with partial matches
- [ ] Application tab uses match for ATS recommendations
- [ ] All 3 tabs show SAME percentage
- [ ] Upload new resume → all tabs recalculate
- [ ] AI Activity Monitor tracks calculation

## Migration Path

### Step 1: Build new service (no breaking changes)
- Create `enhanced-skills-match-service.ts`
- Add database schema updates
- Deploy (nothing breaks, new service unused)

### Step 2: Migrate one tab at a time
1. **Start with Salary Tab** (already has the algorithm)
   - Extract current skills matching logic into new service
   - Test thoroughly

2. **Then Application Tab**
   - Replace centralized service call
   - Verify ATS recommendations still work

3. **Finally Overview Tab**
   - Replace centralized service call
   - Verify match card displays correctly

### Step 3: Remove old code
- Delete `centralized-match-service.ts`
- Delete `resume-matching-service.ts`
- Clean up unused imports

## Estimated Timeline

- **Phase 1:** Create enhanced service - **2-3 hours**
- **Phase 2:** Database schema - **30 minutes**
- **Phase 3A:** Overview tab integration - **1 hour**
- **Phase 3B:** Salary tab integration - **1.5 hours**
- **Phase 3C:** Application tab integration - **1 hour**
- **Phase 4:** Cleanup + testing - **1 hour**

**Total: ~7-8 hours of development**

## Risk Mitigation

### Risk 1: Breaking existing functionality
**Mitigation:**
- Implement new service alongside old one
- Feature flag for rollout
- Comprehensive testing before removing old code

### Risk 2: AI cost increase
**Mitigation:**
- Actually REDUCES cost (one AI call instead of 3)
- Aggressive caching (48 hours)
- Cache hits marked as CACHED in monitor

### Risk 3: Different results from new algorithm
**Mitigation:**
- Use EXISTING Salary Intel algorithm (already proven)
- No algorithm change, just consolidation
- Side-by-side comparison during migration

## Success Metrics

✅ **Consistency:** All 3 tabs show same match percentage
✅ **Performance:** 50-70% faster (cache hits)
✅ **Cost:** 60% reduction in AI calls (3 → 1 with reuse)
✅ **Quality:** Better scores with partial match logic
✅ **UX:** No user-facing changes, just more accurate

## Alternative Approaches Considered

### ❌ Option A: Keep 3 separate calculations
**Pros:** No development work
**Cons:** Inconsistent scores, expensive, confusing

### ❌ Option B: Use Overview tab's simple algorithm everywhere
**Pros:** Easy to implement
**Cons:** Quality degradation (no partial matches)

### ✅ Option C: Use Salary Intel's algorithm everywhere (RECOMMENDED)
**Pros:** Best quality, consistent scores, reduced cost
**Cons:** Requires refactoring (but straightforward)

## Next Steps

1. **Get approval on this plan**
2. **Create feature branch:** `feat/unified-skills-match`
3. **Implement Phase 1:** Enhanced service
4. **Test with real jobs**
5. **Migrate tabs one by one**
6. **Deploy to production**

## Questions to Answer

1. ✅ Which algorithm to use? → Salary Intel (has partial matches)
2. ✅ Where to cache? → `job.matchAnalysis` JSON field
3. ✅ Cache duration? → 48 hours
4. ✅ Invalidation trigger? → Resume change or manual refresh
5. ✅ Breaking changes? → None, backwards compatible
6. ✅ AI task tracking? → One task per calculation

---

**Author:** AI Assistant
**Date:** 2025-10-12
**Status:** PROPOSED - Awaiting approval
