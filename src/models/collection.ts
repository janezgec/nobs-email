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