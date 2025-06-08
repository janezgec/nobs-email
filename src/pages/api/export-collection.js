import { validateUserToken } from '../../models/user';
import { getPB, authSuperAdmin } from '../../lib/pb';
import { getDocumentsForCollection } from '../../models/document';

export async function POST({ request }) {
  const pb = getPB();
  await authSuperAdmin(pb);

  try {
    const body = await request.json();
    const { collectionId, databaseId, token } = body;

    if (!collectionId || !databaseId || !token) {
      return new Response(JSON.stringify({ error: 'Missing collectionId, databaseId, or token' }), {
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

    // Get the collection info to verify it belongs to the user and database
    const collection = await pb.collection('collections').getOne(collectionId);
    if (collection.user !== userId || collection.database !== databaseId) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all documents for this collection
    const documents = await getDocumentsForCollection(pb, collectionId, userId);

    if (documents.length === 0) {
      return new Response(JSON.stringify({ error: 'No data to export' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate CSV content
    const csvContent = generateCSV(documents, collection);
    
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${collection.name}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting collection:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generateCSV(documents, collection) {
  if (documents.length === 0) return '';

  // Get all unique field names from the collection schema and document data
  const fieldNames = new Set();
  
  // Add fields from collection schema
  if (collection.schema) {
    collection.schema.forEach(field => fieldNames.add(field.name));
  }
  
  // Add any additional fields found in document data
  documents.forEach(doc => {
    if (doc.data && typeof doc.data === 'object') {
      Object.keys(doc.data).forEach(key => fieldNames.add(key));
    }
  });

  // Convert to array and sort for consistent order
  const sortedFieldNames = Array.from(fieldNames).sort();
  
  // Add metadata fields
  const headers = ['id', 'created', 'updated', ...sortedFieldNames];
  
  // Generate CSV header
  const csvLines = [headers.map(escapeCSVField).join(',')];
  
  // Generate CSV rows
  documents.forEach(doc => {
    const row = [];
    
    // Add metadata fields
    row.push(escapeCSVField(doc.id || ''));
    row.push(escapeCSVField(doc.created || ''));
    row.push(escapeCSVField(doc.updated || ''));
    
    // Add data fields
    sortedFieldNames.forEach(fieldName => {
      const value = doc.data && doc.data[fieldName] !== undefined ? doc.data[fieldName] : '';
      row.push(escapeCSVField(String(value)));
    });
    
    csvLines.push(row.join(','));
  });
  
  return csvLines.join('\n');
}

function escapeCSVField(field) {
  // Convert to string and handle null/undefined
  const str = field === null || field === undefined ? '' : String(field);
  
  // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}
