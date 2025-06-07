import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Collection } from '../models/collection';

const model = openrouter('google/gemini-2.5-pro-preview', {
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Convert collection schema to Zod schema for AI SDK
function createZodSchemaFromCollections(collections: Collection[]): z.ZodSchema {
  const schemaObject: Record<string, any> = {};
  
  for (const collection of collections) {
    if (collection.name === 'emails') continue; // Skip emails collection
    
    const properties = collection.docDataSchema || {};
    const zodFields: Record<string, any> = {};
    
    // Convert each property to Zod type
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      const schema = fieldSchema as any;
      let zodType;
      
      switch (schema.type) {
        case 'number':
          zodType = z.number().optional();
          break;
        case 'boolean':
          zodType = z.boolean().optional();
          break;
        case 'string':
        default:
          if (schema.format === 'email') {
            zodType = z.string().email().optional();
          } else if (schema.format === 'uri') {
            zodType = z.string().url().optional();
          } else if (schema.format === 'date-time') {
            zodType = z.string().datetime().optional();
          } else {
            zodType = z.string().optional();
          }
          break;
      }
      
      zodFields[fieldName] = zodType;
    }
    
    if (Object.keys(zodFields).length > 0) {
      schemaObject[collection.name] = z.array(z.object(zodFields)).optional();
    }
  }
  
  return z.object(schemaObject);
}

export async function scrapeEmailForData(
  emailContent: string,
  collections: Collection[]
): Promise<{ data: any }> {
  // Filter out emails collection and only process collections with defined schemas
  const validCollections = collections.filter(c => 
    c.name !== 'emails' && 
    c.docDataSchema && 
    Object.keys(c.docDataSchema).length > 0
  );
  
  if (validCollections.length === 0) {
    return { data: {} };
  }
  
  // Create Zod schema from collections
  const zodSchema = createZodSchemaFromCollections(validCollections);
  
  // Build collection descriptions for the prompt
  const collectionDescriptions = validCollections.map(collection => {
    return `${collection.name}:\n    ${JSON.stringify(collection.docDataSchema)}`;
  }).join('\n\n');
  
  const prompt = `
Extract all data from this email content and organize it according to the predefined collections and their schemas.
Only extract data that fits the defined collections and their field types. Do not create new collections or fields.

Available Collections and their schemas:
<COLLECTIONS>
${collectionDescriptions}
</COLLECTIONS>

Email Content:
<EMAIL_CONTENT>
${emailContent}
</EMAIL_CONTENT>

Return a JSON object where each collection name is a key containing an array of objects that match the collection's schema.
Only include collections that have relevant data extracted from the email.
  `.trim();
  
  try {
    const result = await generateObject({
      model,
      schema: zodSchema,
      prompt,
    });

    return {
      data: result.object,
    };

  } catch (error) {
    console.error('Error scraping email data:', error);
    throw new Error(`Failed to parse email data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}