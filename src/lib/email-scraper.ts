// use dotenv to load environment variables
import dotenv from 'dotenv';
dotenv.config({
  path: '../../.env',
});

import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';

async function dataToSchema(data: any, existingSchema?: any): Promise<any> {
  // call the AI model to convert data to schema
  if(!existingSchema) {
    const prompt = `Convert the following data into a structured JSON schema.
  The schema should define collections and their properties based on the data provided.
  Here is the data:
  ${JSON.stringify(data, null, 2)}`;
    const result = await generateObject({
      model: openrouter('google/gemini-2.5-flash-preview', {
        apiKey: process.env.OPENROUTER_API_KEY,
      }),
      output: 'no-schema',
      prompt,
    });

    return result.object;
  } else {
    // if existing schema is provided, update the schema with what is in data
    const prompt = `Update the existing schema according to the new data provided.
  Existing schema:
  ${JSON.stringify(existingSchema, null, 2)}
  New data:
  ${JSON.stringify(data, null, 2)}`;
    const result = await generateObject({
      model: openrouter('google/gemini-2.5-flash-preview', {
        apiKey: process.env.OPENROUTER_API_KEY,
      }),
      output: 'no-schema',
      prompt,
    });
    return result.object;
  }
}

export async function scrapeEmailForData(
  emailContent: string,
  schema: any = null
): any {
  let prompt = `
        Extract from this email contents all the data you can find and return a json with it.
        Have root json properties as collection names and they contain arrays of items (documents).
        Example of collections: people, updates, ai tools, tutorials, companies, materials...
      `.split('\n').map(line => line.trim()).join('\n');

  if (schema) {
    prompt += `\n\nHere is the schema of the data collected so far, you may add new collections or properties or enum values if needed, otherwise use what is there.
    <SCHEMA>${JSON.stringify(schema)}</SCHEMA>`;
  }

  prompt += `\n\n<EMAIL_CONTENT>${emailContent}</EMAIL_CONTENT>`;
  
  try {
    const result = await generateObject({
      model: openrouter('google/gemini-2.5-flash-preview', {
        apiKey: process.env.OPENROUTER_API_KEY,
      }),
      output: 'no-schema',
      prompt,
    });

    const newSchema = await dataToSchema(result.object, schema);
    
    return {
      data: result.object,
      schema: newSchema,
    }

  } catch (error) {
    console.error('Error scraping email data:', error);
    throw new Error(`Failed to parse email data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
