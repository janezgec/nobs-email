import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Collection } from '../models/collection';
import { getVariable } from './../lib/env.ts';

const model = openrouter('google/gemini-2.5-flash-preview', {
  apiKey: getVariable('OPENROUTER_API_KEY'),
  temperature: 0.6
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
        default:
          zodType = z.string().optional();
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
    let description = `${collection.name}:`;
    
    // Add collection description if available
    if (collection.description && collection.description.trim()) {
      description += `\n  Description: ${collection.description}`;
    }
    
    // Add field descriptions
    description += `\n  Fields:`;
    const schema = collection.docDataSchema;
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const field = fieldSchema as any;
      description += `\n    - ${fieldName} (${field.type})`;
      if (field.description && field.description.trim()) {
        description += `: ${field.description}`;
      }
    }
    
    return description;
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