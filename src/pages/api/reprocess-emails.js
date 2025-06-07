import { validateUserToken } from '../../models/user';
import { getPB, authSuperAdmin } from '../../lib/pb';
import { getCollectionsForDatabase } from '../../models/collection';
import { scrapeEmailForData } from '../../lib/email-scraper';
import { insertDocument } from '../../models/document';
import { useQuota, QuotaExceededError } from '../../models/quota';
import TurndownService from 'turndown';

export async function POST({ request }) {
  const pb = getPB();
  await authSuperAdmin(pb);

  try {
    const body = await request.json();
    const { databaseId, token } = body;

    if (!databaseId || !token) {
      return new Response(JSON.stringify({ error: 'Missing databaseId or token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate user token
    const validation = await validateUserToken(token);
    if (!validation.valid || !validation.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = validation.user.id;

    // Verify user owns the database
    const database = await pb.collection('databases').getOne(databaseId);
    if (database.user !== userId) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all collections for this database
    const collections = await getCollectionsForDatabase(pb, databaseId, userId);
    
    // Find the emails collection
    const emailsCollection = collections.find(c => c.name === 'emails');
    if (!emailsCollection) {
      return new Response(JSON.stringify({ error: 'No emails collection found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete all documents in data collections (not emails)
    const dataCollections = collections.filter(c => c.name !== 'emails');
    
    for (const collection of dataCollections) {
      const documents = await pb.collection('documents').getFullList({
        filter: `collection = "${collection.id}" && user = "${userId}"`
      });
      
      for (const document of documents) {
        await pb.collection('documents').delete(document.id);
      }
      console.log(`Deleted ${documents.length} documents from collection: ${collection.name}`);
    }

    // Get all emails sorted by creation date (oldest first)
    const emails = await pb.collection('documents').getFullList({
      filter: `collection = "${emailsCollection.id}" && user = "${userId}"`,
      sort: 'created'
    });

    console.log(`Found ${emails.length} emails to reprocess`);

    let processedCount = 0;
    let extractedCount = 0;
    let skippedQuotaCount = 0;

    // Process each email
    for (const emailDoc of emails) {
      try {
        // Check quota before processing each email
        try {
          await useQuota(pb, userId);
        } catch (error) {
          if (error instanceof QuotaExceededError) {
            console.log(`Quota exceeded for user ${userId}, skipping remaining emails`);
            skippedQuotaCount = emails.length - processedCount;
            break;
          }
          throw error;
        }

        const emailData = emailDoc.data;
        let emailContent = emailData.htmlBody || emailData.textBody || '';
        
        // Convert HTML to markdown if needed
        if (emailData.htmlBody) {
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
          });
          emailContent = turndownService.turndown(emailData.htmlBody);
        }

        if (!emailContent) {
          console.log(`Skipping email ${emailData.messageId} - no content`);
          continue;
        }

        // Get collections with schemas for data extraction
        const collectionsWithSchema = dataCollections.filter(c => 
          c.docDataSchema && 
          Object.keys(c.docDataSchema).length > 0
        );

        if (collectionsWithSchema.length === 0) {
          console.log('No collections with schemas found, skipping data extraction');
          continue;
        }

        // Extract data from email
        const { data } = await scrapeEmailForData(emailContent, collectionsWithSchema);

        // Insert extracted data into collections
        if (data && typeof data === 'object') {
          for (const [collectionName, documents] of Object.entries(data)) {
            if (Array.isArray(documents) && documents.length > 0) {
              const collection = collectionsWithSchema.find(c => c.name === collectionName);
              if (collection) {
                for (const document of documents) {
                  try {
                    await insertDocument(pb, userId, databaseId, collection.id, document, emailDoc.id);
                    extractedCount++;
                  } catch (error) {
                    console.error(`Error inserting document into collection ${collectionName}:`, error);
                  }
                }
              }
            }
          }
        }

        processedCount++;
        console.log(`Processed email ${processedCount}/${emails.length}`);
        
      } catch (error) {
        console.error(`Error processing email ${emailDoc.data.messageId}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processedEmails: processedCount,
      extractedDocuments: extractedCount,
      totalEmails: emails.length,
      skippedQuotaCount: skippedQuotaCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error reprocessing emails:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
