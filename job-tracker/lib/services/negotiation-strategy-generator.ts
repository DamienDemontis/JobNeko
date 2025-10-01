/**
 * Negotiation Strategy Generator
 * Generates personalized salary negotiation strategies based on job context and user leverage
 */

import { ExtractedJobData } from '../ai-service';
import { ResumeJobMatch } from './resume-analysis-service';
import { JobClassification } from './job-classification-engine';
import { ContextualSalaryAnalysis } from './contextual-salary-analyzer';
import { PersonalizedJobInsights } from './personalized-insights-engine';
import { unifiedAI } from './unified-ai-service';

export interface NegotiationStrategy {
  // Overall strategy assessment
  readiness: {
    score: number; // 0-100, readiness to negotiate
    recommendation: 'negotiate_aggressively' | 'negotiate_moderately' | 'accept_gracefully' | 'pass_on_offer';
    reasoning: string;
    confidence: number; // 0-100
  };

  // Leverage analysis
  leverage: {
    userAdvantages: Array<{
      type: 'skills' | 'experience' | 'market' | 'timing' | 'alternatives' | 'cultural_fit';
      strength: 'strong' | 'moderate' | 'weak';
      description: string;
      howToUse: string;
    }>;

    marketPosition: {
      demandLevel: 'high' | 'moderate' | 'low';
      scarcityFactor: number; // 0-100, how rare their skillset is
      replacementDifficulty: 'hard' | 'moderate' | 'easy';
      marketTrends: string[];
    };

    companyFactors: {
      urgencyToHire: 'high' | 'moderate' | 'low';
      budgetFlexibility: 'high' | 'moderate' | 'low' | 'unknown';
      competitiveThreats: string[];
      culturalFit: number; // 0-100
    };
  };

  // Negotiation approach
  approach: {
    overallTone: 'collaborative' | 'assertive' | 'conservative';
    initialRequest: {
      salaryTarget: number;
      currency: string;
      justification: string;
      anchorStrategy: string;
    };

    fallbackPositions: Array<{
      scenario: string;
      response: string;
      minAcceptable: number;
      walkAwayPoint: number;
    }>;

    negotiationSequence: Array<{
      step: number;
      topic: 'salary' | 'equity' | 'benefits' | 'title' | 'start_date' | 'vacation' | 'remote_work';
      priority: 'high' | 'medium' | 'low';
      strategy: string;
      script: string;
    }>;
  };

  // Specific tactics
  tactics: {
    openingMoves: Array<{
      tactic: string;
      when: string;
      script: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;

    countStrategies: Array<{
      theirResponse: string;
      yourCounter: string;
      escalationLevel: 'maintain' | 'increase' | 'de-escalate';
    }>;

    closingMoves: Array<{
      scenario: 'accept' | 'counter' | 'walk_away';
      script: string;
      followUp: string;
    }>;
  };

  // Communication strategy
  communication: {
    keyMessaging: string[];
    avoidanceTopics: string[];

    emailTemplates: {
      initialResponse: string;
      counterOffer: string;
      finalAcceptance: string;
      gracefulDecline: string;
    };

    phoneCallStrategy: {
      keyPoints: string[];
      practiceQuestions: string[];
      emotionalPreparation: string[];
    };

    timingStrategy: {
      bestTimeToNegotiate: string;
      responseTimeline: string;
      pressureHandling: string;
    };
  };

  // Alternative compensation
  alternativeValue: {
    nonSalaryBenefits: Array<{
      benefit: string;
      estimatedValue: number;
      negotiability: 'high' | 'medium' | 'low';
      priority: 'high' | 'medium' | 'low';
      script: string;
    }>;

    creativeOptions: Array<{
      option: string;
      description: string;
      value: string;
      feasibility: 'high' | 'medium' | 'low';
    }>;

    equityConsiderations: {
      requestRecommendation: boolean;
      percentageRange: string;
      valuationConsiderations: string[];
      riskAssessment: string;
    };
  };

  // Risk management
  riskManagement: {
    rescindRisk: {
      likelihood: 'high' | 'medium' | 'low';
      mitigationStrategy: string;
      warningSignals: string[];
    };

    relationshipRisk: {
      impact: 'high' | 'medium' | 'low';
      preventionTactics: string[];
      repairStrategies: string[];
    };

    marketRisk: {
      alternativeOptions: string[];
      backupPlan: string;
      timelineConsiderations: string;
    };
  };

  // Success metrics
  successMetrics: {
    winScenarios: Array<{
      outcome: string;
      probability: number; // 0-100
      value: number;
    }>;

    acceptableOutcomes: string[];
    redLines: string[];

    measurementCriteria: {
      quantitative: string[];
      qualitative: string[];
      longTermValue: string[];
    };
  };

  // Meta information
  strategy_metadata: {
    generated_at: string;
    confidence_level: number; // 0-100
    user_risk_tolerance: 'low' | 'medium' | 'high';
    market_conditions: string;
    validity_period: string; // How long strategy remains relevant
    update_triggers: string[]; // When to regenerate strategy
  };
}

export class NegotiationStrategyGenerator {
  /**
   * Generate comprehensive negotiation strategy
   */
  async generateStrategy(
    job: ExtractedJobData,
    userResume: any,
    classification: JobClassification,
    salaryAnalysis: ContextualSalaryAnalysis,
    personalizedInsights: PersonalizedJobInsights,
    userContext: {
      currentSalary?: number;
      desiredSalary?: number;
      riskTolerance?: 'low' | 'medium' | 'high';
      alternatives?: string[]; // Other opportunities
      urgency?: 'immediate' | 'weeks' | 'months' | 'exploring';
      negotiationExperience?: 'none' | 'limited' | 'experienced';
    }
  ): Promise<NegotiationStrategy> {

    // Generate AI-powered negotiation strategy
    const strategy = await this.generateAIStrategy(
      job,
      userResume,
      classification,
      salaryAnalysis,
      personalizedInsights,
      userContext
    );

    return strategy;
  }

  /**
   * Generate quick negotiation readiness assessment
   */
  async assessNegotiationReadiness(
    job: ExtractedJobData,
    userResume: any,
    userContext?: { currentSalary?: number; alternatives?: string[] }
  ): Promise<Pick<NegotiationStrategy, 'readiness' | 'leverage'>> {

    const leverageScore = this.calculateLeverageScore(job, userResume, userContext);
    const readinessScore = this.calculateReadinessScore(leverageScore, userContext);

    return {
      readiness: {
        score: readinessScore,
        recommendation: this.getReadinessRecommendation(readinessScore),
        reasoning: this.generateReadinessReasoning(readinessScore, leverageScore),
        confidence: 85
      },
      leverage: {
        userAdvantages: this.identifyUserAdvantages(userResume, job),
        marketPosition: this.assessMarketPosition(userResume, job),
        companyFactors: this.assessCompanyFactors(job, {} as any)
      }
    };
  }

  /**
   * Generate situation-specific negotiation tactics
   */
  async generateSituationalTactics(
    situation: 'first_offer' | 'counter_offer' | 'final_round' | 'multiple_offers',
    currentOffer: {
      salary: number;
      currency: string;
      benefits?: string[];
    },
    userGoals: {
      targetSalary: number;
      mustHaves: string[];
      niceToHaves: string[];
    }
  ): Promise<Pick<NegotiationStrategy, 'tactics' | 'communication'>> {

    return {
      tactics: await this.generateContextualTactics(situation, currentOffer, userGoals),
      communication: await this.generateCommunicationStrategy(situation, currentOffer, userGoals)
    };
  }

  private async generateAIStrategy(
    job: ExtractedJobData,
    userResume: any,
    classification: JobClassification,
    salaryAnalysis: ContextualSalaryAnalysis,
    personalizedInsights: PersonalizedJobInsights,
    userContext: any
  ): Promise<NegotiationStrategy> {

    const prompt = `You are a world-class salary negotiation expert. Generate a comprehensive, personalized negotiation strategy.

JOB OPPORTUNITY:
${JSON.stringify(job, null, 2)}

USER RESUME:
${JSON.stringify(userResume, null, 2)}

JOB CLASSIFICATION:
${JSON.stringify(classification, null, 2)}

SALARY ANALYSIS:
${JSON.stringify(salaryAnalysis, null, 2)}

PERSONALIZED INSIGHTS:
${JSON.stringify(personalizedInsights, null, 2)}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

Generate a comprehensive negotiation strategy that maximizes their compensation while maintaining positive relationships.

Consider:
1. Their unique leverage points and market position
2. Company type, culture, and budget constraints
3. Market conditions and timing factors
4. Risk tolerance and alternative options
5. Communication style and relationship building
6. Creative compensation beyond base salary

Return detailed JSON following this structure:

{
  "readiness": {
    "score": number_0_to_100,
    "recommendation": "negotiate_aggressively|negotiate_moderately|accept_gracefully|pass_on_offer",
    "reasoning": "detailed explanation",
    "confidence": number_0_to_100
  },
  "leverage": {
    "userAdvantages": [
      {
        "type": "skills|experience|market|timing|alternatives|cultural_fit",
        "strength": "strong|moderate|weak",
        "description": "specific advantage description",
        "howToUse": "tactical advice"
      }
    ],
    "marketPosition": {
      "demandLevel": "high|moderate|low",
      "scarcityFactor": number_0_to_100,
      "replacementDifficulty": "hard|moderate|easy",
      "marketTrends": ["relevant trends"]
    },
    "companyFactors": {
      "urgencyToHire": "high|moderate|low",
      "budgetFlexibility": "high|moderate|low|unknown",
      "competitiveThreats": ["factors"],
      "culturalFit": number_0_to_100
    }
  },
  "approach": {
    "overallTone": "collaborative|assertive|conservative",
    "initialRequest": {
      "salaryTarget": number,
      "currency": "currency_code",
      "justification": "why this amount",
      "anchorStrategy": "anchoring approach"
    },
    "fallbackPositions": [
      {
        "scenario": "if they say X",
        "response": "your response",
        "minAcceptable": number,
        "walkAwayPoint": number
      }
    ],
    "negotiationSequence": [
      {
        "step": number,
        "topic": "salary|equity|benefits|title|start_date|vacation|remote_work",
        "priority": "high|medium|low",
        "strategy": "approach for this topic",
        "script": "what to say"
      }
    ]
  },
  "tactics": {
    "openingMoves": [
      {
        "tactic": "specific tactic",
        "when": "timing/context",
        "script": "exact words to use",
        "riskLevel": "low|medium|high"
      }
    ],
    "countStrategies": [
      {
        "theirResponse": "what they might say",
        "yourCounter": "your response",
        "escalationLevel": "maintain|increase|de-escalate"
      }
    ],
    "closingMoves": [
      {
        "scenario": "accept|counter|walk_away",
        "script": "what to say",
        "followUp": "next steps"
      }
    ]
  },
  "communication": {
    "keyMessaging": ["core messages"],
    "avoidanceTopics": ["things not to mention"],
    "emailTemplates": {
      "initialResponse": "email template",
      "counterOffer": "email template",
      "finalAcceptance": "email template",
      "gracefulDecline": "email template"
    },
    "phoneCallStrategy": {
      "keyPoints": ["talking points"],
      "practiceQuestions": ["questions to prepare for"],
      "emotionalPreparation": ["mindset advice"]
    },
    "timingStrategy": {
      "bestTimeToNegotiate": "optimal timing",
      "responseTimeline": "how long to wait",
      "pressureHandling": "dealing with pressure"
    }
  },
  "alternativeValue": {
    "nonSalaryBenefits": [
      {
        "benefit": "specific benefit",
        "estimatedValue": number,
        "negotiability": "high|medium|low",
        "priority": "high|medium|low",
        "script": "how to ask for it"
      }
    ],
    "creativeOptions": [
      {
        "option": "creative compensation idea",
        "description": "detailed explanation",
        "value": "estimated value",
        "feasibility": "high|medium|low"
      }
    ],
    "equityConsiderations": {
      "requestRecommendation": boolean,
      "percentageRange": "realistic range",
      "valuationConsiderations": ["factors to consider"],
      "riskAssessment": "equity risk analysis"
    }
  },
  "riskManagement": {
    "rescindRisk": {
      "likelihood": "high|medium|low",
      "mitigationStrategy": "how to minimize risk",
      "warningSignals": ["red flags to watch"]
    },
    "relationshipRisk": {
      "impact": "high|medium|low",
      "preventionTactics": ["how to maintain relationships"],
      "repairStrategies": ["if things go wrong"]
    },
    "marketRisk": {
      "alternativeOptions": ["backup plans"],
      "backupPlan": "if negotiation fails",
      "timelineConsiderations": "timing factors"
    }
  },
  "successMetrics": {
    "winScenarios": [
      {
        "outcome": "specific outcome",
        "probability": number_0_to_100,
        "value": estimated_value
      }
    ],
    "acceptableOutcomes": ["minimum acceptable results"],
    "redLines": ["deal breakers"],
    "measurementCriteria": {
      "quantitative": ["measurable outcomes"],
      "qualitative": ["soft benefits"],
      "longTermValue": ["career impact"]
    }
  }
}

Focus on practical, actionable advice. Be specific with scripts and timing. Consider their personality and risk tolerance.`;

    const response = await unifiedAI.process({
      operation: 'general_completion',
      content: prompt
    });
    if (!response.success) {
      return this.getFallbackStrategy(job, userResume, userContext);
    }

    try {
      const strategy = JSON.parse((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)));

      // Add metadata
      strategy.strategy_metadata = {
        generated_at: new Date().toISOString(),
        confidence_level: this.calculateStrategyConfidence(userResume, job, userContext),
        user_risk_tolerance: userContext.riskTolerance || 'medium',
        market_conditions: 'Current market analysis based on available data',
        validity_period: '2 weeks',
        update_triggers: ['Salary offer received', 'Market conditions change', 'User circumstances change']
      };

      return strategy;
    } catch (error) {
      console.error('Failed to parse negotiation strategy:', error);
      return this.getFallbackStrategy(job, userResume, userContext);
    }
  }

  private calculateLeverageScore(job: ExtractedJobData, userResume: any, userContext?: any): number {
    let score = 50; // Base score

    // Skills match increases leverage
    if (userResume.technicalSkills.length > 0) score += 15;

    // Experience increases leverage
    if (userResume.yearsOfExperience > 3) score += 10;
    if (userResume.yearsOfExperience > 7) score += 10;

    // Alternatives increase leverage
    if (userContext?.alternatives?.length > 0) score += 15;

    // Market factors
    if (userResume.careerLevel === 'senior' || userResume.careerLevel === 'lead') score += 10;

    return Math.min(score, 100);
  }

  private calculateReadinessScore(leverageScore: number, userContext?: any): number {
    let readiness = leverageScore;

    // Risk tolerance affects readiness
    if (userContext?.riskTolerance === 'high') readiness += 10;
    if (userContext?.riskTolerance === 'low') readiness -= 15;

    // Experience affects readiness
    if (userContext?.negotiationExperience === 'experienced') readiness += 10;
    if (userContext?.negotiationExperience === 'none') readiness -= 10;

    return Math.max(Math.min(readiness, 100), 0);
  }

  private getReadinessRecommendation(score: number): 'negotiate_aggressively' | 'negotiate_moderately' | 'accept_gracefully' | 'pass_on_offer' {
    if (score >= 80) return 'negotiate_aggressively';
    if (score >= 60) return 'negotiate_moderately';
    if (score >= 40) return 'accept_gracefully';
    return 'pass_on_offer';
  }

  private generateReadinessReasoning(readinessScore: number, leverageScore: number): string {
    if (readinessScore >= 80) {
      return 'Strong market position and leverage support aggressive negotiation';
    } else if (readinessScore >= 60) {
      return 'Good foundation for moderate negotiation with focus on relationship building';
    } else if (readinessScore >= 40) {
      return 'Limited leverage suggests accepting gracefully with minor requests';
    }
    return 'Low leverage and market position suggest this may not be the right opportunity';
  }

  private identifyUserAdvantages(userResume: any, job: ExtractedJobData) {
    const advantages = [];

    // Skills advantages
    if (userResume.technicalSkills.length > 5) {
      advantages.push({
        type: 'skills' as const,
        strength: 'strong' as const,
        description: 'Broad technical skill set',
        howToUse: 'Emphasize versatility and immediate productivity'
      });
    }

    // Experience advantages
    if (userResume.yearsOfExperience > 5) {
      advantages.push({
        type: 'experience' as const,
        strength: 'strong' as const,
        description: 'Substantial relevant experience',
        howToUse: 'Highlight ability to mentor and lead initiatives'
      });
    }

    return advantages;
  }

  private assessMarketPosition(userResume: any, job: ExtractedJobData) {
    return {
      demandLevel: userResume.careerLevel === 'senior' ? 'high' as const : 'moderate' as const,
      scarcityFactor: userResume.technicalSkills.length * 10,
      replacementDifficulty: userResume.yearsOfExperience > 7 ? 'hard' as const : 'moderate' as const,
      marketTrends: ['Remote work increasing demand', 'Tech skills in high demand']
    };
  }

  private assessCompanyFactors(job: ExtractedJobData, classification: JobClassification) {
    return {
      urgencyToHire: 'moderate' as const,
      budgetFlexibility: classification.companyType === 'startup' ? 'low' as const : 'moderate' as const,
      competitiveThreats: ['Other companies hiring similar roles'],
      culturalFit: 75
    };
  }

  private async generateContextualTactics(situation: string, currentOffer: any, userGoals: any) {
    // Simplified implementation - would be more sophisticated in production
    return {
      openingMoves: [
        {
          tactic: 'Express enthusiasm first',
          when: 'Beginning of negotiation',
          script: 'Thank you for this offer. I\'m excited about the opportunity...',
          riskLevel: 'low' as const
        }
      ],
      countStrategies: [
        {
          theirResponse: 'Budget constraints',
          yourCounter: 'Understand budget concerns, let\'s explore creative solutions',
          escalationLevel: 'maintain' as const
        }
      ],
      closingMoves: [
        {
          scenario: 'accept' as const,
          script: 'I\'m happy to accept this offer and excited to join the team',
          followUp: 'Confirm start date and next steps'
        }
      ]
    };
  }

  private async generateCommunicationStrategy(situation: string, currentOffer: any, userGoals: any) {
    return {
      keyMessaging: ['Enthusiasm for role', 'Value you bring', 'Market research'],
      avoidanceTopics: ['Personal financial needs', 'Other interview details'],
      emailTemplates: {
        initialResponse: 'Thank you for the offer. I\'m excited about the opportunity and would like to discuss the compensation package.',
        counterOffer: 'Based on my research and the value I bring, I was hoping we could discuss a salary of [X].',
        finalAcceptance: 'I\'m pleased to accept your offer and look forward to joining the team.',
        gracefulDecline: 'After careful consideration, I\'ve decided to pursue another opportunity.'
      },
      phoneCallStrategy: {
        keyPoints: ['Express enthusiasm', 'Present market research', 'Focus on value'],
        practiceQuestions: ['What\'s your budget flexibility?', 'Are there other benefits we can discuss?'],
        emotionalPreparation: ['Stay calm and professional', 'Remember your value', 'Be prepared to walk away']
      },
      timingStrategy: {
        bestTimeToNegotiate: 'After receiving initial offer but before accepting',
        responseTimeline: '24-48 hours for thoughtful response',
        pressureHandling: 'Ask for reasonable time to consider, don\'t rush decisions'
      }
    };
  }

  private calculateStrategyConfidence(userResume: any, job: ExtractedJobData, userContext: any): number {
    let confidence = 70;

    if (userResume.confidence > 0.8) confidence += 10;
    if (job.salaryMin) confidence += 10;
    if (userContext.currentSalary) confidence += 10;

    return Math.min(confidence, 100);
  }

  private getFallbackStrategy(job: ExtractedJobData, userResume: any, userContext: any): NegotiationStrategy {
    const leverageScore = this.calculateLeverageScore(job, userResume, userContext);
    const readinessScore = this.calculateReadinessScore(leverageScore, userContext);

    return {
      readiness: {
        score: readinessScore,
        recommendation: this.getReadinessRecommendation(readinessScore),
        reasoning: this.generateReadinessReasoning(readinessScore, leverageScore),
        confidence: 70
      },
      leverage: {
        userAdvantages: this.identifyUserAdvantages(userResume, job),
        marketPosition: this.assessMarketPosition(userResume, job),
        companyFactors: this.assessCompanyFactors(job, {} as JobClassification)
      },
      approach: {
        overallTone: 'collaborative',
        initialRequest: {
          salaryTarget: (job.salaryMin || 80000) * 1.1,
          currency: (job as any).salaryCurrency || 'USD',
          justification: 'Based on market research and value I bring',
          anchorStrategy: 'Present researched market rate'
        },
        fallbackPositions: [
          {
            scenario: 'If budget constraints mentioned',
            response: 'Let\'s explore alternative compensation',
            minAcceptable: job.salaryMin || 80000,
            walkAwayPoint: (job.salaryMin || 80000) * 0.9
          }
        ],
        negotiationSequence: [
          {
            step: 1,
            topic: 'salary',
            priority: 'high',
            strategy: 'Present market research',
            script: 'Based on my research for similar roles...'
          }
        ]
      },
      tactics: {
        openingMoves: [
          {
            tactic: 'Express enthusiasm',
            when: 'First response',
            script: 'Thank you for this opportunity',
            riskLevel: 'low'
          }
        ],
        countStrategies: [
          {
            theirResponse: 'Budget constraints',
            yourCounter: 'Understand, let\'s explore alternatives',
            escalationLevel: 'maintain'
          }
        ],
        closingMoves: [
          {
            scenario: 'accept',
            script: 'Happy to accept and join the team',
            followUp: 'Confirm details and start date'
          }
        ]
      },
      communication: {
        keyMessaging: ['Enthusiasm', 'Value proposition', 'Market alignment'],
        avoidanceTopics: ['Personal finances', 'Other interviews'],
        emailTemplates: {
          initialResponse: 'Thank you for the offer...',
          counterOffer: 'Based on market research...',
          finalAcceptance: 'Pleased to accept...',
          gracefulDecline: 'After consideration...'
        },
        phoneCallStrategy: {
          keyPoints: ['Stay professional', 'Focus on value'],
          practiceQuestions: ['Budget flexibility?', 'Other benefits?'],
          emotionalPreparation: ['Stay calm', 'Know your worth']
        },
        timingStrategy: {
          bestTimeToNegotiate: 'After initial offer',
          responseTimeline: '24-48 hours',
          pressureHandling: 'Ask for reasonable time'
        }
      },
      alternativeValue: {
        nonSalaryBenefits: [
          {
            benefit: 'Additional vacation days',
            estimatedValue: 2000,
            negotiability: 'medium',
            priority: 'medium',
            script: 'Could we discuss additional PTO?'
          }
        ],
        creativeOptions: [
          {
            option: 'Professional development budget',
            description: 'Annual learning and conference budget',
            value: '$2000-5000',
            feasibility: 'high'
          }
        ],
        equityConsiderations: {
          requestRecommendation: false,
          percentageRange: 'Not applicable for this role type',
          valuationConsiderations: [],
          riskAssessment: 'Standard employment role'
        }
      },
      riskManagement: {
        rescindRisk: {
          likelihood: 'low',
          mitigationStrategy: 'Maintain professional tone',
          warningSignals: ['Excessive pressure', 'Unwillingness to discuss']
        },
        relationshipRisk: {
          impact: 'medium',
          preventionTactics: ['Stay collaborative', 'Show enthusiasm'],
          repairStrategies: ['Acknowledge their constraints', 'Find compromise']
        },
        marketRisk: {
          alternativeOptions: ['Continue job search', 'Improve skills'],
          backupPlan: 'Accept current market rate',
          timelineConsiderations: 'Consider urgency of income needs'
        }
      },
      successMetrics: {
        winScenarios: [
          {
            outcome: 'Salary increase of 5-10%',
            probability: 60,
            value: (job.salaryMin || 80000) * 0.05
          }
        ],
        acceptableOutcomes: ['Market rate salary', 'Good benefits package'],
        redLines: ['Below market minimum', 'Poor work-life balance'],
        measurementCriteria: {
          quantitative: ['Total compensation', 'PTO days'],
          qualitative: ['Growth opportunities', 'Company culture'],
          longTermValue: ['Career advancement', 'Skill development']
        }
      },
      strategy_metadata: {
        generated_at: new Date().toISOString(),
        confidence_level: 70,
        user_risk_tolerance: userContext?.riskTolerance || 'medium',
        market_conditions: 'General market conditions analysis',
        validity_period: '2 weeks',
        update_triggers: ['Offer received', 'Market changes', 'User circumstances change']
      }
    };
  }
}

export const negotiationStrategyGenerator = new NegotiationStrategyGenerator();