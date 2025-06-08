import { validateUserToken } from '../../models/user';
import { getPB, authSuperAdmin } from '../../lib/pb';
import { createCollection, ensureEmailCollection, getCollectionsForDatabase } from '../../models/collection';

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

    if(collections.length > 0) {
      // send error response that there are existing collections
      return new Response(JSON.stringify({ error: 'Database already has collections. Please delete them first.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ensure email collection is there
    await ensureEmailCollection(pb, userId, database.id);
    
    // add collection for news
    await createCollection(pb, userId, database.id, 'news', [
      { name: 'image', type: 'string', format: 'uri', description: 'News image' },
      { name: 'title', type: 'string', description: 'News title' },
      { name: 'link', type: 'string', format: 'uri', description: 'Link to the news article' },
      { name: 'summary', type: 'string', description: 'News summary' }
    ], 'Collect all news from emails, no matter how small.');

    await createCollection(pb, userId, database.id, 'people_mentions', [
      { name: 'name', type: 'string', description: 'Name of the person mentioned' },
      { name: 'company', type: 'string', description: 'Company where they work if available' },
      { name: 'link', type: 'string', format: 'uri', description: 'Link associated' },
      { name: 'context', type: 'string', description: 'Context in which the person was mentioned' }
    ], 'Collect mentions of people in emails, when they said something, did something.');

    await createCollection(pb, userId, database.id, 'images', [
      { name: 'image', type: 'string', format: 'uri', description: 'Image URL' },
      { name: 'description', type: 'string', description: 'Description of the image based on the context' }
    ], 'Collect images from emails, no matter how small.');


    return new Response(JSON.stringify({ 
      success: true
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
