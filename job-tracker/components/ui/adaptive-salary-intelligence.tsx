'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { Progress } from './progress';
import {
  TrendingUp,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Users,
  Building,
  Globe,
  DollarSign,
  Clock,
  Target,
  Briefcase,
  GraduationCap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

import { JobClassification, jobClassificationEngine } from '../../lib/services/job-classification-engine';
import { ResumeJobMatch, resumeAnalysisService, UserContext } from '../../lib/services/resume-analysis-service';
import { ResumeExtraction } from '../../lib/services/ai-resume-extractor';
import type { ExtractedJobData } from '../../lib/ai-service';
// import { ContextualSalaryAnalysis, contextualSalaryAnalyzer } from '../../lib/services/contextual-salary-analyzer';
import { PersonalizedJobInsights, personalizedInsightsEngine } from '../../lib/services/personalized-insights-engine';
import { NegotiationStrategy, negotiationStrategyGenerator } from '../../lib/services/negotiation-strategy-generator';
import { RedFlagAnalysis, smartRedFlagDetector } from '../../lib/services/smart-red-flag-detector';
import { FinancialImpactAnalysis, financialImpactCalculator } from '../../lib/services/financial-impact-calculator';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';

interface AdaptiveSalaryIntelligenceProps {
  jobId: string;
  jobData: ExtractedJobData;
  userResume?: ResumeExtraction;
  userLocation?: string;
  userContext?: UserContext;
  className?: string;
}


export function AdaptiveSalaryIntelligence({
  jobId,
  jobData,
  userResume,
  userLocation,
  userContext,
  className = ''
}: AdaptiveSalaryIntelligenceProps) {
  const [classification, setClassification] = useState<JobClassification | null>(null);
  const [resumeMatch, setResumeMatch] = useState<ResumeJobMatch | null>(null);
  const [salaryAnalysis, setSalaryAnalysis] = useState<any | null>(null);
  const [personalizedInsights, setPersonalizedInsights] = useState<PersonalizedJobInsights | null>(null);
  const [negotiationStrategy, setNegotiationStrategy] = useState<NegotiationStrategy | null>(null);
  const [redFlagAnalysis, setRedFlagAnalysis] = useState<RedFlagAnalysis | null>(null);
  const [financialImpact, setFinancialImpact] = useState<FinancialImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Prevent multiple simultaneous calls

  useEffect(() => {
    console.log('🔄 AdaptiveSalaryIntelligence useEffect triggered for jobId:', jobId);
    analyzeJob();
  }, [jobId]); // Only depend on jobId to prevent multiple calls

  const analyzeJob = async () => {
    if (isAnalyzing) {
      console.log('⏸️ Analysis already in progress, skipping...');
      return;
    }

    setIsAnalyzing(true);
    setLoading(true);
    setError(null);

    try {
      // Step 1: Classify the job
      const jobClassification = await jobClassificationEngine.classifyJob(jobData);
      setClassification(jobClassification);

      // Step 2: Analyze resume match if resume is available
      let matchAnalysis: ResumeJobMatch | null = null;
      if (userResume) {
        matchAnalysis = await resumeAnalysisService.analyzeJobMatch(
          userResume,
          jobData,
          userContext
        );
        setResumeMatch(matchAnalysis);
      }

      // Step 3: Get salary analysis with fail-fast approach - NO FALLBACKS
      let salaryData = null;

      try {
        console.log('🚀 Starting single-pass salary analysis...');
        const response = await fetch(`/api/jobs/${jobId}/enhanced-salary-analysis`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Salary analysis failed (${response.status}): ${errorText}`);
        }

        const analysisResult = await response.json();

        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }

        salaryData = analysisResult.data || analysisResult;
        console.log('✅ Enhanced salary analysis completed successfully');

      } catch (error) {
        console.error('❌ Salary analysis failed:', error);
        // Show error to user instead of falling back
        setError(`Salary analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setSalaryAnalysis(null);
      }

      setSalaryAnalysis(salaryData);

      // Optional: Generate additional insights only if salary analysis succeeded
      if (salaryData && userResume && matchAnalysis) {
        try {
          console.log('🔍 Generating personalized insights...');
          const insights = await personalizedInsightsEngine.generateInsights(
            jobData,
            userResume,
            userContext
          );
          setPersonalizedInsights(insights);

          console.log('🎯 Generating negotiation strategy...');
          const strategy = await negotiationStrategyGenerator.generateStrategy(
            jobData,
            userResume,
            jobClassification,
            salaryData,
            insights,
            {
              currentSalary: userContext?.salaryExpectations?.current,
              desiredSalary: userContext?.salaryExpectations?.desired,
              riskTolerance: userContext?.riskTolerance,
              urgency: userContext?.timeline?.urgency,
              negotiationExperience: 'limited'
            }
          );
          setNegotiationStrategy(strategy);
        } catch (error) {
          console.warn('Failed to generate insights/strategy:', error);
          // Don't fail the whole analysis for these optional features
        }
      }

      // Optional: Risk analysis (non-blocking)
      if (salaryData) {
        try {
          console.log('🚩 Analyzing potential red flags...');
          const redFlags = await smartRedFlagDetector.analyzeRedFlags(
            jobData,
            jobClassification,
            salaryData,
            userResume,
            {
              experienceLevel: userResume?.careerLevel as any,
              riskTolerance: userContext?.riskTolerance
            }
          );
          setRedFlagAnalysis(redFlags);
        } catch (error) {
          console.warn('Red flag analysis failed:', error);
          setRedFlagAnalysis(null);
        }
      }

      // Optional: Financial impact calculation (non-blocking)
      if (salaryData?.compensation?.salaryRange) {
        try {
          console.log('💰 Calculating financial impact...');
          const financialAnalysis = await financialImpactCalculator.calculateFinancialImpact(
            jobData,
            salaryData,
            {
              currentSalary: userContext?.salaryExpectations?.current,
              location: userLocation,
              familyStatus: 'single',
              currentExpenses: {},
              financialGoals: {}
            }
          );
          setFinancialImpact(financialAnalysis);
        } catch (error) {
          console.warn('Financial impact analysis failed:', error);
          setFinancialImpact(null);
        }
      }

    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Analyzing job opportunity...</span>
            </div>
            <Progress value={33} className="mb-2" />
            <p className="text-sm text-gray-600">
              Examining job requirements, salary transparency, and market context
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to analyze job: {error}
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeJob}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!classification) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Smart Context */}
      <JobContextHeader
        classification={classification}
        resumeMatch={resumeMatch}
        jobData={jobData}
      />

      {/* Resume Setup Prompt if no resume */}
      {!userResume && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Unlock Personalized Insights</h3>
                <p className="text-gray-700 mb-4">
                  Upload your resume to get personalized salary recommendations, skill-based match analysis,
                  and tailored negotiation strategies for this position.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Personalized salary range
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Skills match analysis
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Negotiation strategy
                  </Badge>
                </div>
                <Link href="/profile">
                  <Button className="gap-2">
                    Set Up Resume in Profile
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Based on Classification */}
      <AdaptiveContent
        classification={classification}
        resumeMatch={resumeMatch}
        jobData={jobData}
        userResume={userResume}
        salaryAnalysis={salaryAnalysis}
        personalizedInsights={personalizedInsights}
        negotiationStrategy={negotiationStrategy}
        redFlagAnalysis={redFlagAnalysis}
        financialImpact={financialImpact}
      />

      {/* Smart Recommendations */}
      {resumeMatch && (
        <SmartRecommendations
          resumeMatch={resumeMatch}
          classification={classification}
        />
      )}
    </div>
  );
}

function JobContextHeader({
  classification,
  resumeMatch,
  jobData
}: {
  classification: JobClassification;
  resumeMatch: ResumeJobMatch | null;
  jobData: ExtractedJobData;
}) {
  const getWorkArrangementIcon = () => {
    switch (classification.workArrangement) {
      case 'remote': return <Globe className="w-5 h-5 text-blue-600" />;
      case 'hybrid': return <Users className="w-5 h-5 text-purple-600" />;
      case 'onsite': return <Building className="w-5 h-5 text-gray-600" />;
      default: return <MapPin className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSalaryTransparencyColor = () => {
    switch (classification.salaryTransparency) {
      case 'disclosed': return 'bg-green-100 text-green-800 border-green-200';
      case 'range': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'negotiable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TBD': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'hidden': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWorkArrangementIcon()}
            <div>
              <CardTitle className="text-lg">
                Smart Salary Analysis
              </CardTitle>
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                {classification.workArrangement.toUpperCase()} • {classification.companyType.toUpperCase()}
                {resumeMatch && (
                  <>
                    <span>•</span>
                    <span className={`font-semibold ${getMatchScoreColor(resumeMatch.matchScore)}`}>
                      {resumeMatch.matchScore}% Match
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getSalaryTransparencyColor()}>
              {classification.salaryTransparency.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {classification.seniorityLevel.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Resume upload prompt now handled by the imported component

function AdaptiveContent({
  classification,
  resumeMatch,
  jobData,
  userResume,
  salaryAnalysis,
  personalizedInsights,
  negotiationStrategy,
  redFlagAnalysis,
  financialImpact
}: {
  classification: JobClassification;
  resumeMatch: ResumeJobMatch | null;
  jobData: ExtractedJobData;
  userResume?: ResumeExtraction;
  salaryAnalysis: any | null;
  personalizedInsights: any | null;
  negotiationStrategy: any | null;
  redFlagAnalysis: any | null;
  financialImpact: FinancialImpactAnalysis | null;
}) {
  // Different content based on classification
  const content = [];

  // Red flag warnings first (if any critical issues)
  if (redFlagAnalysis && redFlagAnalysis.redFlags.critical.length > 0) {
    content.push(
      <RedFlagWarningsSection
        key="red-flags"
        redFlagAnalysis={redFlagAnalysis}
      />
    );
  }

  // Enhanced salary analysis with contextual data
  content.push(
    <EnhancedSalaryAnalysisSection
      key="salary"
      classification={classification}
      jobData={jobData}
      resumeMatch={resumeMatch}
      salaryAnalysis={salaryAnalysis}
      financialImpact={financialImpact}
    />
  );

  // Show resume-based insights if available
  if (resumeMatch && userResume) {
    content.push(
      <ResumeMatchSection
        key="resume-match"
        resumeMatch={resumeMatch}
        classification={classification}
      />
    );
  }

  // Show personalized insights
  if (personalizedInsights) {
    content.push(
      <PersonalizedInsightsSection
        key="personalized-insights"
        insights={personalizedInsights}
        classification={classification}
      />
    );
  }

  // Show financial impact analysis
  if (financialImpact) {
    content.push(
      <FinancialImpactSection
        key="financial-impact"
        financialImpact={financialImpact}
        classification={classification}
      />
    );
  }

  // Show negotiation strategy
  if (negotiationStrategy) {
    content.push(
      <EnhancedNegotiationSection
        key="negotiation"
        strategy={negotiationStrategy}
        classification={classification}
      />
    );
  }

  // Show equity analysis for startups
  if (classification.compensationContext.hasEquity) {
    content.push(
      <EquityAnalysisSection
        key="equity"
        jobData={jobData}
        classification={classification}
      />
    );
  }

  // Show relocation analysis if needed
  if (classification.analysisNeeds.needsRelocationAnalysis) {
    content.push(
      <RelocationAnalysisSection
        key="relocation"
        classification={classification}
        jobData={jobData}
      />
    );
  }

  return <>{content}</>;
}

function SalaryAnalysisSection({
  classification,
  jobData,
  resumeMatch
}: {
  classification: JobClassification;
  jobData: ExtractedJobData;
  resumeMatch: ResumeJobMatch | null;
}) {
  const formatCurrency = (amount: number) => {
    // Handle NaN, undefined, null values
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return 'Not available';
    }

    const currency = classification.locationContext.currency || 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Compensation Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Salary Information */}
        {classification.salaryTransparency === 'disclosed' && jobData.salaryMin && jobData.salaryMax ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Disclosed Salary Range</h4>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(jobData.salaryMin)} - {formatCurrency(jobData.salaryMax)}
            </div>
            {resumeMatch?.salaryInsights.expectedRange && (
              <div className="mt-2 text-sm text-green-600">
                Your expected range: {formatCurrency(resumeMatch.salaryInsights.expectedRange.min)} - {formatCurrency(resumeMatch.salaryInsights.expectedRange.max)}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Estimated Salary Range</h4>
            {resumeMatch?.salaryInsights.expectedRange ? (
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(resumeMatch.salaryInsights.expectedRange.min)} - {formatCurrency(resumeMatch.salaryInsights.expectedRange.max)}
              </div>
            ) : (
              <div className="text-blue-600">
                Upload resume for personalized salary estimate
              </div>
            )}
          </div>
        )}

        {/* Benefits and Compensation Context */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Benefits Level</div>
            <div className="font-semibold capitalize">
              {classification.compensationContext.benefitsLevel}
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Company Type</div>
            <div className="font-semibold capitalize">
              {classification.companyType}
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Work Arrangement</div>
            <div className="font-semibold capitalize">
              {classification.workArrangement}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeMatchSection({
  resumeMatch,
  classification
}: {
  resumeMatch: ResumeJobMatch;
  classification: JobClassification;
}) {
  const getMatchIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <Target className="w-5 h-5 text-blue-600" />;
    return <AlertTriangle className="w-5 h-5 text-orange-600" />;
  };

  const getExperienceIcon = (gap: number) => {
    if (gap > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (gap < 0) return <ArrowDownRight className="w-4 h-4 text-orange-600" />;
    return <Minus className="w-4 h-4 text-blue-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Resume Match Analysis
          <Badge className={resumeMatch.matchScore >= 80 ? 'bg-green-100 text-green-800' :
                            resumeMatch.matchScore >= 60 ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'}>
            {resumeMatch.matchScore}% Match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getMatchIcon(resumeMatch.matchScore)}
            <div>
              <div className="font-semibold">Overall Fit</div>
              <div className="text-sm text-gray-600 capitalize">{resumeMatch.compatibility}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-semibold">Detailed Skills Match</div>
              <div className="text-sm text-gray-600">
                {resumeMatch.skillsAnalysis.matchedSkills.length} / {resumeMatch.skillsAnalysis.matchedSkills.length + resumeMatch.skillsAnalysis.missingSkills.length} skills
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getExperienceIcon(resumeMatch.experienceAnalysis.experienceGap)}
            <div>
              <div className="font-semibold">Experience Level</div>
              <div className="text-sm text-gray-600 capitalize">
                {resumeMatch.experienceAnalysis.careerProgression}
              </div>
            </div>
          </div>
        </div>

        {/* Skills Analysis */}
        <div>
          <h4 className="font-semibold mb-3">Skills Breakdown</h4>
          <div className="space-y-2">
            {resumeMatch.skillsAnalysis.matchedSkills.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Matched Skills:</div>
                <div className="flex flex-wrap gap-1">
                  {resumeMatch.skillsAnalysis.matchedSkills.slice(0, 6).map((skill, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {resumeMatch.skillsAnalysis.missingSkills.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Skills to Develop:</div>
                <div className="flex flex-wrap gap-1">
                  {resumeMatch.skillsAnalysis.missingSkills.slice(0, 6).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Concerns */}
        {resumeMatch.concerns.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Considerations</h4>
            <div className="space-y-2">
              {resumeMatch.concerns.slice(0, 3).map((concern, index) => (
                <Alert key={index} className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong className="capitalize">{concern.type.replace('-', ' ')}:</strong> {concern.description}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EquityAnalysisSection({
  jobData,
  classification
}: {
  jobData: ExtractedJobData;
  classification: JobClassification;
}) {
  if (!classification.compensationContext.hasEquity) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Equity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-2">Equity Offering</h4>
          {jobData.equityOffered ? (
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Type:</strong> {jobData.equityOffered.type}
              </div>
              {jobData.equityOffered.amount && (
                <div className="text-sm">
                  <strong>Amount:</strong> {jobData.equityOffered.amount}
                </div>
              )}
              {jobData.equityOffered.vestingPeriod && (
                <div className="text-sm">
                  <strong>Vesting:</strong> {jobData.equityOffered.vestingPeriod}
                </div>
              )}
            </div>
          ) : (
            <div className="text-purple-600">
              Equity mentioned - details to be discussed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RelocationAnalysisSection({
  classification,
  jobData
}: {
  classification: JobClassification;
  jobData: ExtractedJobData;
}) {
  if (!classification.analysisNeeds.needsRelocationAnalysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Relocation Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Location Considerations</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Job Location:</strong> {jobData.location}</div>
            <div><strong>Country:</strong> {classification.locationContext.country}</div>
            <div><strong>Currency:</strong> {classification.locationContext.currency}</div>
            {classification.locationContext.isInternational && (
              <div className="text-blue-600 font-medium">
                🌍 International opportunity - consider visa requirements
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NegotiationStrategySection({
  classification,
  resumeMatch
}: {
  classification: JobClassification;
  resumeMatch: ResumeJobMatch | null;
}) {
  const negotiationStrength = resumeMatch?.salaryInsights.negotiationStrength || 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Negotiation Strategy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Negotiation Strength</span>
            <div className="flex items-center gap-2">
              <Progress value={negotiationStrength * 10} className="w-20" />
              <span className="font-bold">{negotiationStrength}/10</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Leverage Points</h4>
              <ul className="text-sm space-y-1">
                {classification.salaryTransparency === 'hidden' && (
                  <li>• No posted salary range</li>
                )}
                {resumeMatch?.skillsAnalysis.skillsAdvantage.length && (
                  <li>• Additional valuable skills</li>
                )}
                {classification.compensationContext.isNegotiable && (
                  <li>• Company indicates negotiable</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-orange-700 mb-2">Considerations</h4>
              <ul className="text-sm space-y-1">
                {classification.companyType === 'startup' && (
                  <li>• Startup may have budget constraints</li>
                )}
                {classification.seniorityLevel === 'entry' && (
                  <li>• Limited negotiation room for entry-level</li>
                )}
                {resumeMatch?.experienceAnalysis.experienceGap && resumeMatch.experienceAnalysis.experienceGap < 0 && (
                  <li>• Experience gap may limit leverage</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmartRecommendations({
  resumeMatch,
  classification
}: {
  resumeMatch: ResumeJobMatch;
  classification: JobClassification;
}) {
  const highPriorityRecommendations = resumeMatch.recommendations.filter(r => r.priority === 'high');

  if (highPriorityRecommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Smart Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {highPriorityRecommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="border-l-4 border-l-blue-500 pl-4 py-2">
              <div className="font-semibold text-sm capitalize">
                {rec.category} Strategy
              </div>
              <div className="text-sm text-gray-700 mt-1">{rec.action}</div>
              <div className="text-xs text-gray-500 mt-1">{rec.reasoning}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// New Enhanced Sections

function RedFlagWarningsSection({
  redFlagAnalysis
}: {
  redFlagAnalysis: RedFlagAnalysis;
}) {
  const criticalFlags = redFlagAnalysis.redFlags.critical;
  const highFlags = redFlagAnalysis.redFlags.high;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Warning: Red Flags Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalFlags.map((flag, index) => (
          <Alert key={`critical-${index}`} className="border-red-300 bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-semibold text-red-800">{flag.title}</div>
              <div className="text-sm text-red-700 mt-1">{flag.description}</div>
              <div className="text-xs text-red-600 mt-2">
                <strong>Recommendation:</strong> {flag.recommendation}
              </div>
            </AlertDescription>
          </Alert>
        ))}

        {highFlags.slice(0, 2).map((flag, index) => (
          <Alert key={`high-${index}`} className="border-orange-300 bg-orange-100">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="font-semibold text-orange-800">{flag.title}</div>
              <div className="text-sm text-orange-700 mt-1">{flag.description}</div>
            </AlertDescription>
          </Alert>
        ))}

        <div className="mt-4 p-3 bg-red-100 rounded-lg">
          <div className="font-semibold text-red-800">Overall Risk Assessment</div>
          <div className="text-sm text-red-700 mt-1">
            <strong>Risk Level:</strong> {redFlagAnalysis.riskLevel.toUpperCase()}
          </div>
          <div className="text-sm text-red-700">
            <strong>Recommendation:</strong> {redFlagAnalysis.recommendation.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EnhancedSalaryAnalysisSection({
  classification,
  jobData,
  resumeMatch,
  salaryAnalysis,
  financialImpact
}: {
  classification: JobClassification;
  jobData: ExtractedJobData;
  resumeMatch: ResumeJobMatch | null;
  salaryAnalysis: any | null;
  financialImpact: FinancialImpactAnalysis | null;
}) {
  const formatCurrency = (amount: number, currency = 'USD') => {
    // Handle NaN, undefined, null values
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return 'Not available';
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Enhanced Salary Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Web-Enhanced Salary Range Display */}
        {salaryAnalysis?.compensation?.salaryRange ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Web-Enhanced Salary Analysis</h4>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(salaryAnalysis.compensation.salaryRange.min, salaryAnalysis.compensation.salaryRange.currency)} - {formatCurrency(salaryAnalysis.compensation.salaryRange.max, salaryAnalysis.compensation.salaryRange.currency)}
            </div>
            <div className="mt-2 text-sm text-green-600">
              Market Position: {salaryAnalysis.compensation.marketPosition?.replace('_', ' ').toUpperCase()} • Confidence: {Math.round(salaryAnalysis.compensation.salaryRange.confidence * 100)}%
            </div>
            {salaryAnalysis.compensation.marketData?.length > 0 && (
              <div className="mt-3 text-xs text-green-700">
                <strong>Live Market Data:</strong> {salaryAnalysis.compensation.marketData.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        ) : false ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Salary Analysis Loading...</h4>
            <div className="text-blue-600">
              Gathering real-time market data with Tavily web search...
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-800 mb-2">Analysis In Progress</h4>
            <div className="text-orange-700">
              Unable to retrieve salary data at the moment. This could be due to:
              <ul className="mt-2 text-sm list-disc list-inside">
                <li>Limited public salary information for this role</li>
                <li>Web search services temporarily unavailable</li>
                <li>Job posting doesn't include sufficient details</li>
              </ul>
              <div className="mt-3 text-sm">
                <strong>Recommendation:</strong> Research similar positions on Glassdoor, Salary.com, or LinkedIn Salary Insights for this role at {jobData.company}.
              </div>
            </div>
          </div>
        )}

        {/* Take-home pay if available */}
        {financialImpact && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Monthly Take-Home</div>
              <div className="font-semibold text-lg">
                {formatCurrency(financialImpact.netIncome.monthly)}
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Living Standard</div>
              <div className="font-semibold capitalize">
                {financialImpact.lifestyleImpact.livingStandard}
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Savings Rate</div>
              <div className="font-semibold">
                {financialImpact.lifestyleImpact.whatYouCanAfford.savingsRate.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Web-Enhanced Market Insights */}
        {salaryAnalysis?.market && (
          <div className="space-y-3">
            <h4 className="font-semibold">Market Intelligence (Live Data)</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm">Market Demand</div>
                <div className="text-xs text-gray-600 mt-1">
                  Demand Score: {salaryAnalysis.market.demand}/100
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm">Competition Level</div>
                <div className="text-xs text-gray-600 mt-1">
                  Competition: {salaryAnalysis.market.competition}/100
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm">Growth Outlook</div>
                <div className="text-xs text-gray-600 mt-1">
                  {salaryAnalysis.market.outlook}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Company Analysis */}
        {salaryAnalysis?.company && (
          <div className="space-y-3">
            <h4 className="font-semibold">Company Analysis</h4>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600">
                <strong>Size:</strong> {salaryAnalysis.company.size} • <strong>Industry:</strong> {salaryAnalysis.company.industry}
                {salaryAnalysis.company.glassdoorRating && (
                  <span> • <strong>Rating:</strong> {salaryAnalysis.company.glassdoorRating}/5</span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {salaryAnalysis.company.compensationPhilosophy}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PersonalizedInsightsSection({
  insights,
  classification
}: {
  insights: PersonalizedJobInsights;
  classification: JobClassification;
}) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended': return 'bg-green-100 text-green-800 border-green-200';
      case 'recommended': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'consider': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pass': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Personalized Job Insights
          <Badge className={getRecommendationColor(insights.matchAnalysis.recommendation)}>
            {insights.matchAnalysis.recommendation.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Analysis */}
        <div>
          <h4 className="font-semibold mb-3">Match Analysis</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span>Overall Score</span>
              <span className="font-bold text-lg">{insights.matchAnalysis.overallScore}%</span>
            </div>
            <Progress value={insights.matchAnalysis.overallScore} className="mb-3" />
            <p className="text-sm text-gray-700">{insights.matchAnalysis.reasoning}</p>
          </div>
        </div>

        {/* Skills Insights */}
        <div>
          <h4 className="font-semibold mb-3">Skills Analysis</h4>
          <div className="space-y-3">
            {insights.skillsInsights.strongMatches.length > 0 && (
              <div>
                <div className="text-sm font-medium text-green-700 mb-2">Strong Skill Matches</div>
                <div className="flex flex-wrap gap-2">
                  {insights.skillsInsights.strongMatches.slice(0, 5).map((skill, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                      {skill.skill} ({skill.relevance}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {insights.skillsInsights.developmentOpportunities.length > 0 && (
              <div>
                <div className="text-sm font-medium text-orange-700 mb-2">Skills to Develop</div>
                <div className="space-y-2">
                  {insights.skillsInsights.developmentOpportunities.slice(0, 3).map((skill, index) => (
                    <div key={index} className="text-xs bg-orange-50 p-2 rounded">
                      <div className="font-medium">{skill.skill}</div>
                      <div className="text-orange-600">{skill.impact}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Application Strategy */}
        <div>
          <h4 className="font-semibold mb-3">Application Strategy</h4>
          <div className="space-y-2">
            {insights.applicationStrategy.coverLetterPoints.slice(0, 3).map((point, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialImpactSection({
  financialImpact,
  classification
}: {
  financialImpact: FinancialImpactAnalysis;
  classification: JobClassification;
}) {
  const formatCurrency = (amount: number) => {
    // Handle NaN, undefined, null values
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return 'Not available';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Financial Impact Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Net Income Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Take-Home Pay
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl">
              <div className="text-xs font-medium text-green-700 mb-2">Monthly</div>
              <div className="text-lg font-bold text-green-800">{formatCurrency(financialImpact.netIncome.monthly)}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
              <div className="text-xs font-medium text-blue-700 mb-2">Bi-weekly</div>
              <div className="text-lg font-bold text-blue-800">{formatCurrency(financialImpact.netIncome.biweekly)}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl">
              <div className="text-xs font-medium text-purple-700 mb-2">Weekly</div>
              <div className="text-lg font-bold text-purple-800">{formatCurrency(financialImpact.netIncome.weekly)}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl">
              <div className="text-xs font-medium text-orange-700 mb-2">Daily</div>
              <div className="text-lg font-bold text-orange-800">{formatCurrency(financialImpact.netIncome.daily)}</div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Monthly Breakdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Net Income</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(financialImpact.netIncome.monthly)}
              </div>
              <div className="text-xs text-gray-600 mt-1">After taxes & deductions</div>
            </div>

            <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Expenses</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(financialImpact.netIncome.monthly * 0.7)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Est. living costs</div>
            </div>

            <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Savings</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(financialImpact.netIncome.monthly * (financialImpact.lifestyleImpact.whatYouCanAfford.savingsRate / 100))}
              </div>
              <div className="text-xs text-gray-600 mt-1">{financialImpact.lifestyleImpact.whatYouCanAfford.savingsRate.toFixed(1)}% savings rate</div>
            </div>
          </div>
        </div>

        {/* Lifestyle Impact */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Lifestyle Impact
          </h4>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center md:text-left">
                <div className="font-medium text-gray-700 mb-2">Living Standard</div>
                <div className="text-3xl font-bold capitalize text-blue-700 mb-2">
                  {financialImpact.lifestyleImpact.livingStandard}
                </div>
                <div className="text-sm text-blue-600">
                  Affordability Index: {financialImpact.lifestyleImpact.affordabilityIndex}/100
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm"><strong>Housing:</strong> {financialImpact.lifestyleImpact.whatYouCanAfford.housingType}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm"><strong>Transportation:</strong> {financialImpact.lifestyleImpact.whatYouCanAfford.carType}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm"><strong>Dining:</strong> {financialImpact.lifestyleImpact.whatYouCanAfford.diningOut}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Family Scenarios */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Family Scenarios
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 font-semibold text-sm">1</span>
                </div>
                <div className="font-semibold text-gray-900">Single</div>
              </div>
              <div className="text-sm text-gray-600 mb-3 leading-relaxed">
                {financialImpact.familyScenarios.single.description}
              </div>
              <div className="flex justify-center">
                {financialImpact.familyScenarios.single.comfortable ?
                  <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">✓ Comfortable</Badge> :
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">⚠ Tight</Badge>
                }
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">2</span>
                </div>
                <div className="font-semibold text-gray-900">Couple</div>
              </div>
              <div className="text-sm text-gray-600 mb-3 leading-relaxed">
                {financialImpact.familyScenarios.couple.description}
              </div>
              <div className="flex justify-center">
                {financialImpact.familyScenarios.couple.comfortable ?
                  <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">✓ Comfortable</Badge> :
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">⚠ Dual Income</Badge>
                }
              </div>
            </div>

            <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold text-sm">4</span>
                </div>
                <div className="font-semibold text-gray-900">Family of 4</div>
              </div>
              <div className="text-sm text-gray-600 mb-3 leading-relaxed">
                {financialImpact.familyScenarios.familyOfFour.description}
              </div>
              <div className="flex justify-center">
                {financialImpact.familyScenarios.familyOfFour.feasible ?
                  <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">✓ Feasible</Badge> :
                  <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1">⚠ Challenging</Badge>
                }
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EnhancedNegotiationSection({
  strategy,
  classification
}: {
  strategy: NegotiationStrategy;
  classification: JobClassification;
}) {
  const getReadinessColor = (recommendation: string) => {
    switch (recommendation) {
      case 'negotiate_aggressively': return 'bg-green-100 text-green-800 border-green-200';
      case 'negotiate_moderately': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accept_gracefully': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pass_on_offer': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Negotiation Strategy
          <Badge className={getReadinessColor(strategy.readiness.recommendation)}>
            {strategy.readiness.recommendation.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Readiness Assessment */}
        <div>
          <h4 className="font-semibold mb-3">Negotiation Readiness</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span>Readiness Score</span>
              <span className="font-bold text-lg">{strategy.readiness.score}/100</span>
            </div>
            <Progress value={strategy.readiness.score} className="mb-3" />
            <p className="text-sm text-gray-700">{strategy.readiness.reasoning}</p>
          </div>
        </div>

        {/* Leverage Analysis */}
        <div>
          <h4 className="font-semibold mb-3">Your Leverage</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium text-green-700 mb-2">Advantages</div>
              <div className="space-y-2">
                {strategy.leverage.userAdvantages.slice(0, 3).map((advantage, index) => (
                  <div key={index} className="text-sm bg-green-50 p-2 rounded">
                    <div className="font-medium capitalize">{advantage.type}</div>
                    <div className="text-green-700 text-xs">{advantage.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-medium text-blue-700 mb-2">Market Position</div>
              <div className="space-y-2 text-sm">
                <div><strong>Demand Level:</strong> {strategy.leverage.marketPosition.demandLevel}</div>
                <div><strong>Scarcity Factor:</strong> {strategy.leverage.marketPosition.scarcityFactor}/100</div>
                <div><strong>Replacement Difficulty:</strong> {strategy.leverage.marketPosition.replacementDifficulty}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Negotiation Approach */}
        <div>
          <h4 className="font-semibold mb-3">Recommended Approach</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium">Overall Tone</div>
                <div className="text-xl font-bold capitalize text-blue-700">
                  {strategy.approach.overallTone}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Target: {new Intl.NumberFormat('en-US', { style: 'currency', currency: strategy.approach.initialRequest.currency, maximumFractionDigits: 0 }).format(strategy.approach.initialRequest.salaryTarget)}
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium mb-2">Justification</div>
                <div className="text-blue-700">{strategy.approach.initialRequest.justification}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Opening Moves */}
        {strategy.tactics.openingMoves.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Opening Tactics</h4>
            <div className="space-y-2">
              {strategy.tactics.openingMoves.slice(0, 2).map((tactic, index) => (
                <div key={index} className="border-l-4 border-l-blue-500 pl-4 py-2 bg-gray-50">
                  <div className="font-medium text-sm">{tactic.tactic}</div>
                  <div className="text-xs text-gray-600 mt-1">{tactic.script}</div>
                  <Badge className={`mt-1 text-xs ${tactic.riskLevel === 'low' ? 'bg-green-100 text-green-800' : tactic.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {tactic.riskLevel} risk
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}