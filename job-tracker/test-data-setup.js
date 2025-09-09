// Setup test data for Nancy, France to verify salary intelligence fix
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestData() {
  console.log('🔧 Setting up test data for Nancy, France...');
  
  try {
    // Delete existing data first
    await prisma.cityData.deleteMany({
      where: {
        OR: [
          { city: 'Nancy', country: 'France' },
          { city: 'Paris', country: 'France' }
        ]
      }
    });

    // Add Nancy, France data with realistic cost-of-living index (much lower than the old hardcoded 105%)
    const nancyData = await prisma.cityData.create({
      data: {
        id: 'test_nancy_france',
        city: 'Nancy',
        country: 'France', 
        state: null,
        costOfLivingIndex: 65.2,  // Much more realistic for Nancy - about 65% of NYC
        rentIndex: 45.8,
        groceriesIndex: 68.1,
        restaurantIndex: 62.4,
        transportIndex: 58.7,
        utilitiesIndex: 71.3,
        qualityOfLifeIndex: 78.5,
        safetyIndex: 82.1,
        healthcareIndex: 85.0,
        educationIndex: 79.2,
        avgNetSalaryUSD: 2850, // Average monthly net salary in USD
        population: 104885,
        lastUpdated: new Date(),
        source: 'test_data_realistic',
        dataPoints: 150
      }
    });

    // Add Paris data for comparison (should be more expensive)
    const parisData = await prisma.cityData.create({
      data: {
        id: 'test_paris_france',
        city: 'Paris',
        country: 'France',
        state: null,
        costOfLivingIndex: 88.5,  // Paris should be more expensive than Nancy
        rentIndex: 102.3,
        groceriesIndex: 84.2,
        restaurantIndex: 91.7,
        transportIndex: 76.4,
        utilitiesIndex: 82.1,
        qualityOfLifeIndex: 83.2,
        safetyIndex: 71.8,
        healthcareIndex: 87.5,
        educationIndex: 84.6,
        avgNetSalaryUSD: 3650,
        population: 2165423,
        lastUpdated: new Date(),
        source: 'test_data_realistic',
        dataPoints: 2800
      }
    });

    console.log('✅ Test data setup complete!');
    console.log(`Nancy cost index: ${nancyData.costOfLivingIndex}% (should make $80k comfortable)`);
    console.log(`Paris cost index: ${parisData.costOfLivingIndex}% (should be higher than Nancy)`);
    
    return { nancyData, parisData };
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestData().catch(console.error);
}

module.exports = { setupTestData };