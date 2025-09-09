// Quick test to verify Nancy, France salary intelligence fix
// This should show $80k as "comfortable" or "thriving", not "tight"

import { calculateEnhancedSalary } from './lib/services/salary-calculator.js';

async function testNancyFranceFix() {
  console.log('🧪 Testing Nancy, France salary intelligence fix...');
  console.log('====================================================');
  
  const testCases = [
    {
      salary: '80000 USD',
      location: 'Nancy, France',
      workMode: 'onsite',
      expectedResult: 'Should show as comfortable/thriving, NOT tight'
    },
    {
      salary: '€60000',
      location: 'Nancy, France', 
      workMode: 'onsite',
      expectedResult: 'Should show as comfortable for European salary'
    },
    {
      salary: '80000 USD',
      location: 'Worldwide (Remote)',
      workMode: 'remote',
      expectedResult: 'Should use user location or default reasonably'
    },
    {
      salary: '80000 USD',
      location: 'Paris, France',
      workMode: 'onsite', 
      expectedResult: 'Should be different from Nancy (Paris more expensive)'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n🔍 Test ${i + 1}: ${test.salary} in ${test.location}`);
    console.log(`Expected: ${test.expectedResult}`);
    console.log('----------------------------------------');
    
    try {
      const result = await calculateEnhancedSalary(
        test.salary,
        test.location,
        test.workMode,
        {
          currentLocation: 'Nancy',
          currentCountry: 'France',
          familySize: 1,
          dependents: 0,
          maritalStatus: 'single'
        }
      );

      if (result) {
        console.log(`✅ Analysis successful!`);
        console.log(`📊 Cost of Living Index: ${result.locationData.costOfLivingIndex}%`);
        console.log(`💰 Salary Range: $${result.normalizedSalaryUSD.min?.toLocaleString()} - $${result.normalizedSalaryUSD.max?.toLocaleString()}`);
        console.log(`📈 Comfort Score: ${result.comfortScore}/100`);
        console.log(`🎯 Comfort Level: ${result.comfortLevel}`);
        console.log(`🔄 Purchasing Power: ${result.purchasingPower?.toFixed(2)}x`);
        console.log(`💡 Data Sources: ${result.locationData.source || 'N/A'}`);
        
        // Check if the fix worked
        if (test.location.includes('Nancy') && result.comfortLevel === 'tight') {
          console.log('❌ BUG STILL EXISTS: Nancy showing as "tight" - hardcoded data still being used!');
        } else if (test.location.includes('Nancy') && ['comfortable', 'thriving'].includes(result.comfortLevel)) {
          console.log('✅ FIX WORKING: Nancy correctly showing as comfortable/thriving!');
        }
      } else {
        console.log('❌ Analysis failed - no result returned');
      }
    } catch (error) {
      console.log('❌ Test failed with error:', error.message);
      console.log('🔧 This might be expected during development as APIs integrate');
    }
    
    console.log('----------------------------------------');
  }

  console.log('\n🎉 Testing complete!');
  console.log('\n📋 Summary:');
  console.log('- If you see "BUG STILL EXISTS", hardcoded data is still being used');
  console.log('- If you see "FIX WORKING", the AI system is generating realistic thresholds');
  console.log('- Cost of living index should be ~65% for Nancy, not 105%');
  console.log('- $80k should show as "comfortable" or "thriving" in Nancy, France');
}

// Run the test
testNancyFranceFix().catch(error => {
  console.error('Test execution failed:', error);
});