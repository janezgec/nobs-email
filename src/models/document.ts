import type { RecordModel } from 'pocketbase';
import PocketBase from 'pocketbase';

export interface Document extends RecordModel {
  id: string;
  user: string; // User ID
  collection: string; // Collection ID
  database: string; // Database ID
  data: Record<string, any>; // Document data
  embeds: any[]; // Array of embedded documents
  created: string; // ISO date string
  updated: string; // ISO date string
}

export async function getDocumentsForCollection(pb: PocketBase, collectionId: string, userId: string): Promise<Document[]> {
  try {
    const records = await pb.collection('documents').getFullList({
      filter: `collection = "${collectionId}" && user = "${userId}"`
    });
    return records as Document[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}