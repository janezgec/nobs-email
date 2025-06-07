import PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Collection extends RecordModel {
  id: string;
  name: string;
  database: string;
  user: string; // User ID
  docDataSchema: any; // JSON schema for document data
  created: string; // ISO date string
  updated: string; // ISO date string
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
  required?: boolean;
  description?: string;
}

export async function ensureCollection(pb: PocketBase, userId: string, databaseId: string, collectionName: string): Promise<RecordModel> {
  try {
    const collectionRecord = await pb.collection('collections').getFirstListItem(`name="${collectionName}" && database="${databaseId}"`);
    return collectionRecord as RecordModel;
  } catch (error) {
    if(error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const collectionRecord = await pb.collection('collections').create({
        name: collectionName,
        database: databaseId,
        user: userId
      });
      console.log(`Collection ${collectionName} created in database ${databaseId} for user ${userId}`);
      return collectionRecord as RecordModel;
    } else {
      console.error(`Error ensuring collection ${collectionName} in database ${databaseId} for user ${userId}:`, error);
      throw error;
    }
  }
}

export async function getCollectionsForDatabase(pb: PocketBase, databaseId: string, userId: string): Promise<Collection[]> {
  try {
    const records = await pb.collection('collections').getFullList({
      filter: `database = "${databaseId}" && user = "${userId}"`
    });
    return records as Collection[];
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

export async function listenToCollections(
  pb: PocketBase, 
  databaseId: string, 
  userId: string, 
  callback: (collections: Collection[]) => void
): Promise<() => void> {
  const fetchAndNotify = async () => {
    try {
      const records = await getCollectionsForDatabase(pb, databaseId, userId);
      callback(records);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // Initial fetch
  await fetchAndNotify();

  // Subscribe to real-time updates
  const unsubscribe = pb.collection('collections').subscribe('*', (e) => {
    console.log('Collection update:', e);
    fetchAndNotify();
  }, {
    filter: `database = "${databaseId}" && user = "${userId}"`
  });

  // Return unsubscribe function
  return async () => {
    (await unsubscribe)?.();
  };
}

export async function createCollection(
  pb: PocketBase, 
  userId: string, 
  databaseId: string, 
  collectionName: string,
  schema?: SchemaField[]
): Promise<Collection> {
  try {
    // Check if collection already exists
    const existingCollection = await pb.collection('collections').getFirstListItem(
      `name="${collectionName}" && database="${databaseId}"`
    );
    throw new Error(`Collection "${collectionName}" already exists in this database`);
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      // Collection doesn't exist, create it
      const docDataSchema = schema ? schemaFieldsToJsonSchema(schema) : {};
      
      const collectionRecord = await pb.collection('collections').create({
        name: collectionName,
        database: databaseId,
        user: userId,
        docDataSchema
      });
      console.log(`Collection ${collectionName} created in database ${databaseId} for user ${userId}`);
      return collectionRecord as Collection;
    } else {
      // Re-throw the error if it's not a 404
      throw error;
    }
  }
}

export async function updateCollectionSchema(
  pb: PocketBase,
  userId: string,
  collectionId: string,
  schema: SchemaField[]
): Promise<Collection> {
  try {
    // Verify ownership
    const collection = await pb.collection('collections').getOne(collectionId);
    if (collection.user !== userId) {
      throw new Error('You can only update your own collections');
    }
    
    const docDataSchema = schemaFieldsToJsonSchema(schema);
    
    const updatedCollection = await pb.collection('collections').update(collectionId, {
      docDataSchema
    });
    
    console.log(`Collection schema updated for collection ${collectionId}`);
    return updatedCollection as Collection;
  } catch (error) {
    console.error(`Error updating collection schema for ${collectionId}:`, error);
    throw error;
  }
}

export async function deleteCollection(pb: PocketBase, userId: string, collectionId: string): Promise<void> {
  try {
    // Verify ownership
    const collection = await pb.collection('collections').getOne(collectionId);
    if (collection.user !== userId) {
      throw new Error('You can only delete your own collections');
    }
    
    // Delete all documents in this collection
    const documents = await pb.collection('documents').getFullList({
      filter: `collection = "${collectionId}" && user = "${userId}"`
    });
    
    for (const document of documents) {
      await pb.collection('documents').delete(document.id);
    }
    
    // Delete the collection
    await pb.collection('collections').delete(collectionId);
    console.log(`Collection ${collectionId} deleted for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting collection ${collectionId} for user ${userId}:`, error);
    throw error;
  }
}

function schemaFieldsToJsonSchema(fields: SchemaField[]): any {
  const properties: any = {};
  
  for (const field of fields) {
    properties[field.name] = {
      type: getJsonSchemaType(field.type),
      description: field.description || ''
    };
    
    if (field.type === 'email') {
      properties[field.name].format = 'email';
    } else if (field.type === 'url') {
      properties[field.name].format = 'uri';
    } else if (field.type === 'date') {
      properties[field.name].format = 'date-time';
    }
  }
  
  return properties;
}

function getJsonSchemaType(fieldType: SchemaField['type']): string {
  switch (fieldType) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'email':
    case 'url':
    case 'string':
    default:
      return 'string';
  }
}

export function jsonSchemaToSchemaFields(jsonSchema: any): SchemaField[] {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return [];
  }
  
  return Object.entries(jsonSchema).map(([name, schema]: [string, any]) => {
    let type: SchemaField['type'] = 'string';
    
    if (schema.type === 'number') {
      type = 'number';
    } else if (schema.type === 'boolean') {
      type = 'boolean';
    } else if (schema.format === 'email') {
      type = 'email';
    } else if (schema.format === 'uri') {
      type = 'url';
    } else if (schema.format === 'date-time') {
      type = 'date';
    }
    
    return {
      name,
      type,
      description: schema.description || '',
      required: false // We'll handle required fields separately if needed
    };
  });
}