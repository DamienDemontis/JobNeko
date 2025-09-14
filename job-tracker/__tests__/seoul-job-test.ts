/**
 * Test for Seoul-based Back-end SW Developer position
 * This replicates the user's specific case that was failing
 */

import { perfectAIRAG } from '../lib/services/perfect-ai-rag';

// Mock AI service
jest.mock('../lib/ai-service', () => ({
  generateCompletion: jest.fn()
}));

import { generateCompletion } from '../lib/ai-service';
const mockGenerateCompletion = generateCompletion as jest.MockedFunction<typeof generateCompletion>;

describe('Seoul Job Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockAIResponse = (data: any) => ({
    content: JSON.stringify(data)
  });

  test('should handle Seoul-based Back-end SW Developer without errors', async () => {
    // Mock job analysis
    mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({
      jobTitle: "Back-end SW developer",
      seniorityLevel: "mid",
      industry: "Telecommunications",
      skills: ["Java", "Spring Boot", "Microservices", "REST APIs"],
      experienceRequired: 3,
      remotePolicy: "onsite",
      normalizedLocation: "Seoul, South Korea",
      jobType: "fulltime",
      compensationModel: "salary",
      compensationMentioned: false,
      equityMentioned: false,
      benefitsMentioned: ["health insurance", "pension"],
      salaryRange: null,
      isPostedSalary: false
    }));

    // Mock external API responses with minimal data
    mockGenerateCompletion.mockResolvedValue(createMockAIResponse({
      placeholder: "api_response"
    }));

    // Mock final synthesis response
    mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({
      role: {
        title: "Back-end SW developer",
        normalizedTitle: "Backend Software Developer",
        seniorityLevel: "mid",
        industry: "Telecommunications",
        skillsRequired: ["Java", "Spring Boot", "Microservices", "REST APIs"],
        experienceLevel: 3,
        marketDemand: 80,
        jobType: "fulltime",
        workMode: "onsite",
        compensationModel: "salary"
      },
      compensation: {
        salaryRange: {
          min: 45000000,  // Korean Won
          max: 65000000,  // Korean Won
          median: 55000000,
          currency: "KRW",
          confidence: 0.75
        },
        totalCompensation: {
          base: 55000000,
          bonus: 5000000,
          equity: 0,
          benefits: 3000000,
          total: 63000000
        },
        marketPosition: "average",
        negotiationPower: 6
      },
      location: {
        jobLocation: "Seoul, South Korea",
        userLocation: null,
        isRemote: false,
        effectiveLocation: "Seoul, South Korea",
        costOfLiving: 85,
        housingCosts: 1200000, // Monthly rent in KRW
        taxes: {
          federal: 0.06,
          state: 0.10,
          local: 0.01,
          total: 0.17
        },
        qualityOfLife: 78,
        marketMultiplier: 0.85
      },
      market: {
        demand: 85,
        competition: 70,
        growth: 0.08,
        outlook: "growing",
        timeToHire: 35,
        alternatives: 120
      },
      analysis: {
        overallScore: 75,
        pros: ["Stable telecommunications industry", "Good work-life balance", "Strong tech ecosystem in Seoul"],
        cons: ["Lower compensation vs US markets", "High competition"],
        risks: ["Economic volatility", "Rapid technology changes"],
        opportunities: ["5G development", "IoT expansion", "Digital transformation"],
        recommendations: ["Focus on cloud technologies", "Develop microservices expertise", "Consider additional certifications"]
      }
    }));

    // This should not throw the "location is not defined" error
    const result = await perfectAIRAG.analyzeJobOffer(
      "Back-end SW developer position at Ericsson in Seoul. On-site work required. Salary to be determined.",
      "Seoul, South Korea",
      "Ericsson"
    );

    // Verify the analysis completed successfully
    expect(result).toBeDefined();
    expect(result.role.title).toBe("Back-end SW developer");
    expect(result.location.jobLocation).toBe("Seoul, South Korea");
    expect(result.location.isRemote).toBe(false);
    expect(result.compensation.salaryRange.currency).toBe("KRW");
    expect(result.confidence).toBeDefined();
    expect(result.confidence.estimateType).toBeDefined();
  });

  test('should handle empty/undefined job analysis gracefully', async () => {
    // Mock job analysis returning empty object
    mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({}));

    // Mock external APIs
    mockGenerateCompletion.mockResolvedValue(createMockAIResponse({}));

    // Mock final synthesis
    mockGenerateCompletion.mockResolvedValueOnce(createMockAIResponse({
      role: {
        title: "Unknown Position",
        normalizedTitle: "Unknown Position",
        seniorityLevel: "mid",
        industry: "General",
        skillsRequired: [],
        experienceLevel: 0,
        marketDemand: 50,
        jobType: "fulltime",
        workMode: "onsite",
        compensationModel: "salary"
      },
      compensation: {
        salaryRange: {
          min: 50000,
          max: 70000,
          median: 60000,
          currency: "USD",
          confidence: 0.5
        },
        totalCompensation: {
          base: 60000,
          bonus: 0,
          equity: 0,
          benefits: 5000,
          total: 65000
        },
        marketPosition: "average",
        negotiationPower: 5
      },
      location: {
        jobLocation: "Unknown Location",
        userLocation: null,
        isRemote: false,
        effectiveLocation: "New York, NY", // Fallback location
        costOfLiving: 100,
        housingCosts: 2000,
        taxes: {
          federal: 0.22,
          state: 0.05,
          local: 0.01,
          total: 0.28
        },
        qualityOfLife: 70,
        marketMultiplier: 1.0
      },
      market: {
        demand: 50,
        competition: 50,
        growth: 0.03,
        outlook: "stable",
        timeToHire: 30,
        alternatives: 50
      },
      analysis: {
        overallScore: 60,
        pros: ["Analysis completed"],
        cons: ["Limited information available"],
        risks: ["Uncertain job details"],
        opportunities: ["Potential for clarification"],
        recommendations: ["Request more job details"]
      }
    }));

    // This should not fail even with empty job analysis
    const result = await perfectAIRAG.analyzeJobOffer(
      "Minimal job description",
      undefined, // No location provided
      undefined  // No company provided
    );

    // Should provide fallback values
    expect(result.role.title).toBe("Unknown Position");
    expect(result.location.effectiveLocation).toBe("New York, NY");
    expect(result.compensation.salaryRange.min).toBeGreaterThan(0);
  });
});