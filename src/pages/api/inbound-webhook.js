import { postmarkPayloadToEmailData, getUsernameFromEmail, getDatabaseFromEmail } from './../../lib/email-parser';
import { getUserByUsername } from './../../models/user';
import { ensureDatabase } from './../../models/database';
import { ensureEmailCollection, getCollectionsForDatabase } from './../../models/collection';
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
    const databaseName = getDatabaseFromEmail(email.to);
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
    
    // ensure email collection with static schema
    const emailCollection = await ensureEmailCollection(pb, user.id, database.id);
    
    // prepare email data according to schema
    const emailData = {
      messageId: email.messageId,
      from: email.from,
      subject: email.subject || '',
      htmlBody: email.htmlBody || '',
      textBody: email.textBody || ''
    };
    
    // insert email into database (skip if it already exists)
    const existingEmail = await getDocumentByDataProperty(pb, emailCollection.id, 'messageId', email.messageId);
    if (existingEmail) {
      console.log('Email already exists in the database, skipping insert');
      return successResponse(email);
    }
    const emailPB = await insertDocument(pb, user.id, database.id, emailCollection.id, emailData);

    // Scrape email content using predefined collection schemas
    let emailContent = email.htmlBody || email.textBody || '';
    
    if(!emailContent) {
      console.error('No HTML or text content found in email');
      return successResponse(email);
    }

    // Only process collections that have defined schemas (excluding emails collection)
    const collectionsWithSchema = collections.filter(c => 
      c.name !== 'emails' && 
      c.docDataSchema && 
      Object.keys(c.docDataSchema).length > 0
    );

    if (collectionsWithSchema.length === 0) {
      console.log('No collections with defined schemas found, skipping data extraction');
      return successResponse(email);
    }
    
    const { data } = await scrapeEmailForData(emailContent, collectionsWithSchema);

    // Process each collection in the scraped data
    if (data && typeof data === 'object') {
      for (const [collectionName, documents] of Object.entries(data)) {
        if (Array.isArray(documents) && documents.length > 0) {
          // Find the existing collection
          const collection = collections.find(c => c.name === collectionName);
          if (!collection) {
            console.log(`Collection ${collectionName} not found, skipping`);
            continue;
          }
          
          // Insert documents into the collection
          for (const document of documents) {
            try {
              await insertDocument(pb, user.id, database.id, collection.id, document, emailPB.id);
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