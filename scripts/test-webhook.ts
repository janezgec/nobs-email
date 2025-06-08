// use dotenv to load environment variables
import dotenv from 'dotenv';
dotenv.config({
  path: '../.env',
});

import testWebhookPayload from './test-webhook-payload.json';

// Import the webhook function directly
import { POST } from '../src/pages/api/inbound-webhook.js';

// Mock Postmark webhook payload
const mockPostmarkPayload = testWebhookPayload;

// Mock request object
function createMockRequest(body: any, secret: string) {
  return {
    json: async () => body,
    url: `http://localhost:3000/api/inbound-webhook?secret=${secret}`
  };
}

(async function testWebhook() {
  try {
    console.log('Testing inbound webhook function directly (unit test)...');
    
    // Create mock request object
    const mockRequest = createMockRequest(mockPostmarkPayload, import.meta.env.POSTMARK_WEBHOOK_SECRET);
    
    // Call the webhook function directly
    const response = await POST({ request: mockRequest });
    
    // Parse the response
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
    if (response.status === 200 && result.success) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
    
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
})();