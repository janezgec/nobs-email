import { postmarkPayloadToEmailData, getUsernameFromEmail, getDatabaseFromEmail } from './../../lib/email-parser';
import { getUserByUsername } from './../../models/user';
import { ensureDatabase } from './../../models/database';
import { ensureCollection, getCollectionsForDatabase } from './../../models/collection';
import { getPB, authSuperAdmin } from './../../lib/pb';
import { getDocumentByDataProperty, insertDocument } from './../../models/document';
import { scrapeEmailForData } from './../../lib/email-scraper';

function successResponse(email) {
  return new Response(JSON.stringify({
      success: true, 
      message: 'Email webhook processed successfully',
      messageId: email.messageId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
}

export async function POST({ request }) {
  const pb = getPB();
  await authSuperAdmin(pb);

  try {
    const body = await request.json();
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== process.env.POSTMARK_WEBHOOK_SECRET) {
      console.error('Invalid Postmark webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const email = postmarkPayloadToEmailData(body);
    const username = getUsernameFromEmail(email.from);

    // get user
    const user = await getUserByUsername(pb, username);

    // get database
    const databaseName = getDatabaseFromEmail(email.from);
    const database = await ensureDatabase(pb, user.id, databaseName);
    if (!database) {
      console.error('Database not found or could not be created');
      return new Response(JSON.stringify({ error: 'Database not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // get all collections in database
    const collections = await getCollectionsForDatabase(pb, database.id, user.id);
    
    // Build schema from existing collections
    const existingSchema = {};
    collections.forEach(collection => {
      if (collection.docDataSchema && collection.name !== 'emails') {
        existingSchema[collection.name] = collection.docDataSchema;
      }
    });

    // insert email into database (skip if it already exists)
    const emailCollection = await ensureCollection(pb, user.id, database.id, 'emails');
    const existingEmail = await getDocumentByDataProperty(pb, emailCollection.id, 'messageId', email.messageId);
    if (existingEmail) {
      console.log('Email already exists in the database, skipping insert');
      return successResponse(email);
    }
    const emailPB = await insertDocument(pb, user.id, database.id, emailCollection.id, email);


    // Scrape email content
    const emailContent = email.htmlBody || email.textBody || '';
    if(!emailContent) {
      console.error('No HTML or text content found in email');
      return successResponse(email);
    }

    
    const { data, schema } = await scrapeEmailForData(emailContent, Object.keys(existingSchema).length > 0 ? existingSchema : null);
    
    // Process each collection in the scraped data
    if (data && typeof data === 'object') {
      for (const [collectionName, documents] of Object.entries(data)) {
        if (Array.isArray(documents) && documents.length > 0) {
          // Ensure collection exists
          const collection = await ensureCollection(pb, user.id, database.id, collectionName);
          
          // Update collection schema if it has changed
          if (schema && schema[collectionName]) {
            try {
              await pb.collection('collections').update(collection.id, {
                docDataSchema: schema[collectionName]
              });
              console.log(`Updated schema for collection: ${collectionName}`);
            } catch (error) {
              console.error(`Error updating schema for collection ${collectionName}:`, error);
            }
          }
          
          // Insert documents into the collection
          for (const document of documents) {
            try {
              await insertDocument(pb, user.id, database.id, collection.id, document);
              console.log(`Inserted document into collection: ${collectionName}`);
            } catch (error) {
              console.error(`Error inserting document into collection ${collectionName}:`, error);
            }
          }
        }
      }
    }
    

    return successResponse(email);
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}