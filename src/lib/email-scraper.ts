// use dotenv to load environment variables
import dotenv from 'dotenv';
dotenv.config({
  path: '../../.env',
});

import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';

const model = openrouter('google/gemini-2.5-flash-preview', {
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function dataToSchema(data: any, existingSchema?: any): Promise<any> {
  // call the AI model to convert data to schema
  if(!existingSchema) {
    const prompt = `Transform this data into JSON schema, do NOT make any properties required:
  ${JSON.stringify(data, null, 2)}`;
    const result = await generateObject({
      model,
      output: 'no-schema',
      prompt,
    });

    return result.object;
  } else {
    // if existing schema is provided, update the schema with what is in data
    const prompt = `Update the existing JSON schema according to the new data provided. Add new properties, enum values where necessary but don't remove anything.
  Existing schema:
  ${JSON.stringify(existingSchema, null, 2)}
  New data:
  ${JSON.stringify(data, null, 2)}`;
    const result = await generateObject({
      model,
      output: 'no-schema',
      prompt,
    });
    return result.object;
  }
}

export async function scrapeEmailForData(
  emailContent: string,
  schema: any = null
): Promise<{ data: any; schema: any }> {
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
      model,
      output: 'no-schema',
      prompt,
    });

    const data = result.object || {};

    // clean up collections that shouldn't be there
    const unwantedCollections = ['email', 'emails', 'email_content', 'email_contents'];
    for (const collection of unwantedCollections) {
      if (data[collection]) {
        delete data[collection];
      }
    }

    const newSchema = await dataToSchema(data, schema);
    
    return {
      data: result.object,
      schema: newSchema,
    }

  } catch (error) {
    console.error('Error scraping email data:', error);
    throw new Error(`Failed to parse email data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}