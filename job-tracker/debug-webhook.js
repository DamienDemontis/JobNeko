// Debug script to test the n8n webhook
async function testWebhook() {
  console.log('🔍 Testing n8n webhook...\n');
  
  const testUrl = 'https://dev-korea.com/job/123';
  
  try {
    console.log('📡 Making request to: http://localhost:5678/webhook/extract-job');
    console.log('📝 Payload:', { url: testUrl });
    
    const response = await fetch('http://localhost:5678/webhook/extract-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl
      })
    });
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response Body Length:', responseText.length);
    console.log('📊 Response Body:', responseText);
    
    if (response.ok && responseText.trim()) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ JSON parsed successfully:', result);
      } catch (parseError) {
        console.log('\n❌ JSON parsing failed:', parseError.message);
      }
    } else if (response.ok && !responseText.trim()) {
      console.log('\n⚠️ Response is OK but body is empty - check workflow configuration');
    } else {
      console.log('\n❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    console.log('\n❌ Network error:', error.message);
  }
}

// For Node.js (if you want to run with node debug-webhook.js)
if (typeof window === 'undefined') {
  const fetch = require('node-fetch');
  testWebhook();
}

// For browser console
if (typeof window !== 'undefined') {
  window.testWebhook = testWebhook;
  console.log('Run testWebhook() in the browser console');
}