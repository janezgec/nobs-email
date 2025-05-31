import PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Database extends RecordModel {
  id: string;
  name: string;
  user: string; // User ID
  created: string; // ISO date string
  updated: string; // ISO date string
}

export async function ensureDatabase(pb: PocketBase, userId: string, databaseName: string): Promise<RecordModel> {
  try {
    const databaseRecord = await pb.collection('databases').getFirstListItem(`name="${databaseName}" && user="${userId}"`);
    return databaseRecord as RecordModel;
  } catch (error) {
    if(error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const databaseRecord = await pb.collection('databases').create({
        name: databaseName,
        user: userId
      });
      console.log(`Database ${databaseName} created for user ${userId}`);
      return databaseRecord as RecordModel;
    } else {
      console.error(`Error ensuring database ${databaseName} for user ${userId}:`, error);
      throw error;
    }
  }
}